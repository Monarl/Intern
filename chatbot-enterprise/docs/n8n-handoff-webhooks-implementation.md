# n8n Human Handoff Webhook Implementation Guide

This guide provides detailed implementation instructions for the n8n webhooks required for the human handoff system in the Enterprise Chatbot.

## Overview

The human handoff system requires 3 main n8n webhooks that integrate with the chat widget and admin dashboard:

1. **Handoff Request Webhook** - Triggered when user requests human support
2. **Handback to Bot Webhook** - Triggered when agent returns control to bot
3. **Agent Status Webhook** - For tracking agent availability (future enhancement)

## Current Database Schema

Based on the existing Supabase schema, these tables are used:

```sql
-- Chat sessions with handoff metadata
CREATE TABLE chat_sessions (
  session_id UUID PRIMARY KEY,
  chatbot_id UUID REFERENCES chatbots(id),
  user_identifier TEXT,
  platform TEXT DEFAULT 'web',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',  -- Contains handoff_requested, handoff_reason, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages with agent intervention metadata
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(session_id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- Contains agent_intervention, handback_to_bot, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 1. Handoff Request Webhook

### Webhook Configuration
- **Endpoint**: `POST /webhook/handoff-request`
- **Method**: POST
- **Authentication**: None (internal webhook)

### Frontend Implementation Location
**File**: `chatbot-enterprise/chat-widget/src/components/ChatWidget.tsx`
**Function**: `handleRequestHandoff` (line ~803)

**Code Snippet**:
```typescript
// Trigger n8n webhook for handoff notification
if (n8nWebhookUrl) {
  try {
    await fetch(n8nWebhookUrl.replace('/rag-chat', '/handoff-request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        chatbotId,
        userIdentifier,
        reason: reason || 'User requested human support',
        timestamp: new Date().toISOString()
      })
    })
  } catch (webhookError) {
    console.warn('Failed to notify n8n of handoff request:', webhookError)
  }
}
```

### Input Payload
```json
{
  "sessionId": "uuid-v4-session-id",
  "chatbotId": "uuid-v4-chatbot-id", 
  "userIdentifier": "uuid-v4-user-id",
  "reason": "User provided reason or 'User requested human support'",
  "timestamp": "2025-01-31T10:30:00.000Z"
}
```

### n8n Workflow Implementation

#### Required Nodes:
1. **Webhook Trigger Node**
   - Type: `n8n-nodes-base.webhook`
   - Path: `/handoff-request`
   - Method: `POST`

2. **Process Data Node**
   - Type: `n8n-nodes-base.set`
   - Extract fields from webhook body

3. **Get Support Agent Emails Node**
   - Type: `n8n-nodes-base.postgres`
   - Query support agent emails from Supabase

4. **Format Email Data Node**
   - Type: `n8n-nodes-base.code`
   - Process emails and format notification data

5. **Gmail Notification Node**
   - Type: `n8n-nodes-base.gmail`
   - Send email to all support agents

6. **Success Response Node**
   - Type: `n8n-nodes-base.respondToWebhook`
   - Return success response

7. **Error Handling Nodes**
   - Format Error + Error Response for robust error handling

#### Node Configuration:

**1. Webhook Trigger**
```json
{
  "parameters": {
    "path": "handoff-request",
    "httpMethod": "POST",
    "options": {}
  }
}
```

**2. Process Data**
```json
{
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "name": "sessionId",
          "value": "={{ $json.body.sessionId }}",
          "type": "string"
        },
        {
          "name": "chatbotId",
          "value": "={{ $json.body.chatbotId }}",
          "type": "string"
        },
        {
          "name": "userIdentifier", 
          "value": "={{ $json.body.userIdentifier }}",
          "type": "string"
        },
        {
          "name": "reason",
          "value": "={{ $json.body.reason }}",
          "type": "string"
        },
        {
          "name": "timestamp",
          "value": "={{ $json.body.timestamp }}",
          "type": "string"
        }
      ]
    }
  }
}
```

**3. Get Support Agent Emails**
```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT au.email, ur.name as role_name FROM auth.users au JOIN user_role_mappings urm ON au.id = urm.user_id JOIN user_roles ur ON urm.role_id = ur.id WHERE ur.name IN ('Support Agent', 'Super Admin') AND au.email IS NOT NULL",
    "options": {}
  }
}
```

**4. Format Email Data (JavaScript Code)**
```javascript
// Extract emails from the query result
const supportAgents = $input.all();
const emails = [];

// Handle both single result and multiple results
supportAgents.forEach(agent => {
  if (agent.json && agent.json.email) {
    emails.push(agent.json.email);
  }
});

// Get session data from previous node
const sessionData = $('Process Data').first().json;

// Create formatted timestamp
const timestamp = new Date(sessionData.timestamp);
const formattedTime = timestamp.toLocaleString('vi-VN', {
  year:   'numeric',
  month:  'long',     // "tháng 7", "tháng 8", ...
  day:    'numeric',
  hour:   '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
  hour12: false       // → 24-giờ; bỏ dòng này nếu muốn 12-giờ
});

// Create dashboard link
const dashboardUrl = `${process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || 'http://localhost:3000'}/dashboard/chats/${sessionData.sessionId}`;

return {
  json: {
    emails: emails,
    sessionId: sessionData.sessionId,
    chatbotId: sessionData.chatbotId,
    userIdentifier: sessionData.userIdentifier,
    reason: sessionData.reason,
    timestamp: sessionData.timestamp,
    formattedTime: formattedTime,
    dashboardUrl: dashboardUrl,
    emailCount: emails.length
  }
};
```

**5. Gmail Notification**
```json
{
  "parameters": {
    "authentication": "oAuth2",
    "sendTo": "={{ $json.emails.join(',') }}",
    "subject": "🚨 Human Support Requested - Session {{ $json.sessionId.substring(0, 8) }}...",
    "emailType": "html",
    "message": "HTML email template with session details and dashboard link"
  }
}
```

**6. Success Response**
```json
{
  "parameters": {
    "respondWith": "json",
    "responseBody": "{\"success\": true, \"message\": \"Handoff request processed and support team notified\", \"sessionId\": \"{{ $('Process Data').item.json.sessionId }}\", \"emailsSent\": {{ $('Format Email Data').item.json.emailCount }}}"
  }
}
```

### Expected Response
```json
{
  "success": true,
  "message": "Handoff request processed and support team notified",
  "sessionId": "uuid-session-id",
  "emailsSent": 3,
  "timestamp": "2025-01-31T10:30:00.000Z"
}
```

## Setup Requirements for the Handoff Request Workflow

### 1. Supabase Connection
Configure a PostgreSQL connection in n8n:
- **Name**: `Supabase PostgreSQL`
- **Host**: Your Supabase database host
- **Database**: `postgres`
- **User**: Service role or appropriate user
- **Password**: Your Supabase database password
- **Port**: `5432`
- **SSL**: Enabled

### 2. Gmail OAuth2 Setup
Configure Gmail OAuth2 credentials in n8n:
- **Name**: `Gmail OAuth2`
- **Client ID**: Your Google OAuth2 client ID
- **Client Secret**: Your Google OAuth2 client secret
- **Scope**: `https://www.googleapis.com/auth/gmail.send`

### 3. Environment Variables
Ensure these environment variables are available:
```env
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3000
```

### 4. Database Schema Requirements
Ensure your Supabase database has the proper user roles structure:
- `auth.users` table with email addresses
- `user_roles` table with role names including 'Support Agent' and 'Super Admin'
- `user_role_mappings` table linking users to roles

## Complete n8n Workflow JSON

The complete workflow is available at: `chatbot-enterprise/n8n-workflows/handoff-request-workflow.json`

### Key Features:
- **No Database Updates**: Database updates are handled by ChatWidget.tsx
- **Email Notifications**: Professional HTML emails sent to all support agents
- **Dynamic Email List**: Automatically queries Supabase for current support agents
- **Rich Email Content**: Includes session details, dashboard links, and action buttons
- **Error Handling**: Robust error handling with proper HTTP status codes
- **Responsive Design**: HTML emails work across different email clients

## 2. Agent Status Webhook (Future Enhancement)

### Webhook Configuration
- **Endpoint**: `POST /webhook/agent-status`
- **Method**: POST
- **Authentication**: Required (agent JWT token)

### Input Payload
```json
{
  "agentId": "uuid-v4-agent-id",
  "status": "available|busy|offline",
  "timestamp": "2025-01-31T10:30:00.000Z"
}
```

### Implementation Notes
This webhook would be called from:
- Admin dashboard when agents log in/out
- Automatic status detection based on activity
- Manual status updates by agents

## Database Schema Extensions

To fully support the webhook system, consider adding these tables:

```sql
-- Track handoff events for analytics
CREATE TABLE handoff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(session_id),
  chatbot_id UUID REFERENCES chatbots(id),
  agent_id UUID,
  event_type TEXT CHECK (event_type IN ('handoff_request', 'handback_to_bot', 'agent_join')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track agent availability
CREATE TABLE agent_status (
  agent_id UUID PRIMARY KEY,
  status TEXT CHECK (status IN ('available', 'busy', 'offline')) DEFAULT 'offline',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment Variables

Add these to your `.env.local` files:

```env
# n8n webhook base URL
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook/rag-chat

# Support team notification settings
SUPPORT_TEAM_TELEGRAM_CHAT_ID=@support_team_channel
SUPPORT_TEAM_EMAIL=support@company.com
```

## Testing the Webhooks

### 1. Test Handoff Request

**Chat Widget**:
1. Open chat widget
2. Click human support button  
3. Enter reason and submit
4. Check n8n execution log
5. Verify support team notification
6. Check database session metadata

**Expected Database State**:
```json
{
  "handoff_requested": "true",
  "handoff_requested_at": "2025-01-31T10:30:00.000Z", 
  "handoff_reason": "User reason here",
  "support_notified": true
}
```

## Error Handling

### Common Issues and Solutions

1. **Webhook Not Found (404)**
   - Verify n8n workflow is active
   - Check webhook path matches exactly
   - Ensure n8n is running on correct port

2. **Database Connection Errors**
   - Verify Supabase credentials in n8n
   - Check database table names and schema
   - Ensure proper SQL query syntax

3. **Notification Failures**
   - Verify Telegram bot token and chat ID
   - Check email SMTP configuration
   - Test notification channels separately

4. **Session ID Mismatches**
   - Ensure UUIDs are properly formatted
   - Check session_id vs id column references
   - Verify frontend sends correct session identifier

## Security Considerations

1. **Webhook Authentication**
   - Add API key validation for production
   - Use HTTPS in production environment
   - Implement rate limiting

2. **Data Validation**
   - Validate all input parameters
   - Sanitize database queries
   - Check user permissions for agent actions

3. **Error Information**
   - Don't expose internal errors to frontend
   - Log detailed errors for debugging
   - Return generic error messages to clients

## Monitoring and Analytics

Track these metrics through the webhooks:

- **Handoff Request Rate**: Number of handoff requests per day/hour
- **Resolution Time**: Time from handoff request to handback
- **Agent Utilization**: How many sessions each agent handles
- **Common Reasons**: Most frequent handoff reasons
- **Success Rate**: Percentage of successful handoffs

This data can be collected through the n8n workflows and stored in dedicated analytics tables for dashboard reporting.
