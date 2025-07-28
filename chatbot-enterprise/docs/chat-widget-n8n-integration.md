# Chat Widget - n8n Integration Documentation

## Overview
This document describes the integration between the Chat Widget frontend and the n8n RAG workflow for processing chat messages and returning AI responses.

## Frontend to n8n Communication

### Request Format (UPDATED)
The chat widget now sends requests with proper UUID session IDs to the n8n webhook endpoint:

```json
{
  "message": "User's message text",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "chatbotId": "f47ac10b-58cc-4372-a567-0e02b2c3d479", 
  "userIdentifier": "550e8400-e29b-41d4-a716-446655440001",
  "metadata": {
    "platform": "web",
    "timestamp": "2025-01-18T04:45:15.750Z"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | The user's input message that needs processing |
| `sessionId` | string | Unique UUID identifying the chat session (used for context) |
| `chatbotId` | string | UUID of the chatbot configuration being used |
| `userIdentifier` | string | Unique UUID for the user (persistent across sessions) |
| `metadata.platform` | string | Always "web" for chat widget |
| `metadata.timestamp` | string | ISO timestamp when message was sent |

## n8n Workflow Requirements

### Expected Workflow Logic
The n8n workflow should perform the following tasks:

1. **Receive Webhook Request**
   - Accept POST request at `/webhook/rag-chat`
   - Parse incoming JSON payload

2. **Session Management**  
   - Lookup existing chat_sessions by session_id
   - Create new session if not found
   - Get session database ID for message storage

3. **Message Processing**
   - Process the user message through RAG system
   - Query vector database for relevant context
   - Generate AI response using Gemini

4. **Database Operations**
   - Save user message to `chat_messages` table using session DB ID
   - Save AI response to `chat_messages` table  
   - Update session metadata if needed

5. **Response Generation**
   - Return JSON response with processing status
   - Let Supabase real-time handle frontend updates

### Database Schema Integration

The workflow should use these tables:

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),      -- Database ID (used for FK)
  chatbot_id UUID REFERENCES chatbots(id),
  session_id TEXT UNIQUE NOT NULL,                    -- Frontend session ID
  user_identifier TEXT,
  platform TEXT DEFAULT 'web',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### chat_messages  
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),      -- References chat_sessions.id (not session_id)
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required n8n Workflow Actions

#### 1. Get or Create Session
```sql
-- First, try to get existing session
SELECT id FROM chat_sessions WHERE session_id = $sessionId;

-- If not found, create new session
INSERT INTO chat_sessions (session_id, chatbot_id, user_identifier, platform, metadata)
VALUES ($sessionId, $chatbotId, $userIdentifier, 'web', $metadata)
RETURNING id;
```

#### 2. Save User Message
```sql
INSERT INTO chat_messages (session_id, role, content, metadata)
VALUES ($sessionDbId, 'user', $message, $metadata);
```

#### 3. Save AI Response
```sql
INSERT INTO chat_messages (session_id, role, content, metadata)
VALUES ($sessionDbId, 'assistant', $aiResponse, $responseMetadata);
```

#### 4. Update Session Activity
```sql
UPDATE chat_sessions 
SET updated_at = NOW(), 
    metadata = metadata || $newMetadata
WHERE id = $sessionDbId;
```

## n8n Response Format

### Success Response
```json
{
  "success": true,
  "message": "Message processed successfully",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "responseId": "550e8400-e29b-41d4-a716-446655440002"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Real-time Communication

The chat widget uses **Supabase Realtime** for receiving AI responses:

1. **Frontend Setup**: Subscribes to `chat_messages` table changes filtered by `session_id`
2. **n8n Action**: Inserts AI response into `chat_messages` table
3. **Real-time Update**: Frontend automatically receives and displays the new message

### Important: Database ID vs Session ID
- Frontend sends `sessionId` (text UUID)
- Database `chat_sessions.session_id` stores this value
- Messages reference `chat_sessions.id` (UUID primary key)
- Real-time filter uses database ID: `session_id=eq.${sessionDbId}`

### Realtime Subscription Filter
```javascript
// Frontend subscribes using database session ID, not text session ID
filter: `session_id=eq.${sessionDbId}`
```

## Error Handling

### Frontend Error Scenarios
- Network connectivity issues
- n8n webhook timeout
- Invalid response format
- Database connection errors
- Session creation failures

### n8n Error Scenarios  
- Gemini API failures
- Vector database errors
- Database insertion errors
- Knowledge base access issues
- Session lookup failures

### Error Recovery
- Frontend shows error message to user
- User can retry sending message
- Session remains active for retry attempts
- New session created if session corrupted

## Configuration

### Environment Variables
```env
# n8n webhook endpoint
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook/rag-chat

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://zvnqtphjgzfnikviyajj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Demo chatbot ID  
NEXT_PUBLIC_DEFAULT_CHATBOT_ID=f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### n8n Workflow Configuration
- Configure Supabase credentials in n8n
- Configure Gemini API key in n8n  
- Set webhook path to `/webhook/rag-chat`
- Enable CORS for chat widget domain

## Current Issues Fixed

### ✅ UUID Validation Errors
- **Problem**: Frontend was generating non-UUID session IDs like `session_1752814857842_zummubtvw`
- **Solution**: Now using `uuid` package to generate proper UUIDs
- **Impact**: Database accepts session IDs and chat works properly

### ✅ Database Relationship Mismatch
- **Problem**: Frontend querying with text session_id but messages table expects UUID
- **Solution**: Frontend now tracks both session_id and sessionDbId
- **Impact**: Real-time updates and message storage work correctly

### ✅ Beautiful UI Design
- **Problem**: Basic styling looked unprofessional
- **Solution**: Modern gradient design with animations, better UX
- **Impact**: Professional appearance suitable for enterprise use

## Testing

### Manual Testing Steps
1. Start n8n: `n8n start`
2. Import RAG workflow into n8n
3. Start chat widget: `npm run dev`  
4. Open `http://localhost:3001`
5. Click chat button and send test message
6. Verify response appears in chat (when n8n properly configured)

### Integration Testing Checklist
- ✅ Valid chatbot ID accepted
- ✅ Session creation with proper UUIDs
- ✅ Message display in beautiful UI
- ✅ Real-time subscription setup
- ⏳ n8n workflow response handling (needs n8n configuration)
- ⏳ Error handling for failed requests

## Task 3.3 Recommendations

Based on this implementation, Task 3.3 (Advanced Features) should focus on:

### 1. **Enhanced n8n Workflow Features**
- **Human Handoff**: Detect when to transfer to human agent
- **Conversation Context**: Maintain multi-turn conversation memory using session history
- **Intent Recognition**: Classify user intents for better responses
- **Response Personalization**: Use user history for personalized responses

### 2. **Advanced UI Features**
- **Typing Indicators**: Show when AI is typing responses
- **Message Status**: Delivered, read, processing indicators  
- **File Upload**: Allow users to upload documents to knowledge base
- **Quick Replies**: Predefined response buttons for common questions
- **Message Reactions**: User satisfaction feedback (thumbs up/down)

### 3. **Analytics & Monitoring Dashboard**
- **Conversation Analytics**: Track user satisfaction, resolution rates
- **Performance Metrics**: Response times, error rates, API usage
- **User Behavior**: Track common questions, user flows, drop-off points
- **Real-time Monitoring**: Live chat sessions, active users
- **A/B Testing**: Test different chatbot personalities/responses

### 4. **Multi-platform Integration**  
- **Embeddable Script**: Generate embed code for any website
- **Mobile App Integration**: React Native or mobile web optimization
- **Social Media Bots**: Facebook Messenger, WhatsApp integration
- **Voice Integration**: Speech-to-text and text-to-speech capabilities

### 5. **Advanced Security & Compliance**
- **Rate Limiting**: Prevent spam/abuse with Redis-based limiting
- **Input Sanitization**: Secure handling of user input, XSS prevention
- **Session Security**: Secure session handling, automatic expiration
- **Data Privacy**: GDPR compliance, data anonymization, user data deletion

### 6. **Enterprise Management Features**
- **Multi-tenant Support**: Multiple organizations, isolated data
- **Custom Branding**: Per-organization theming, custom domains
- **SSO Integration**: Enterprise authentication (SAML, OIDC)
- **Audit Logging**: Comprehensive activity logs, compliance reporting
- **Backup & Recovery**: Automated data backup and disaster recovery

This foundation provides a solid base for implementing these advanced features in Task 3.3.
