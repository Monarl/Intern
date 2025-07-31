# Human Handoff Implementation (Task 4.2)

## Overview

This document describes the implementation of human handoff functionality in the Enterprise Chatbot System, allowing users to request human support and enabling support agents to take over conversations.

## Components Implemented

### 1. Chat Widget Enhancement (`chat-widget/src/components/ChatWidget.tsx`)

#### New Features Added:
- **Manual Handoff Request Button**: A user-facing button (👤+) next to the send button
- **Handoff Request Dialog**: Modal dialog asking for optional reason
- **Handoff Status Indicator**: Visual feedback when handoff is requested
- **State Management**: New state variables for handoff functionality
- ✨ **Real-time Handback Detection**: Automatically detects when agent hands back to bot
- ✨ **Button State Restoration**: Restores handoff button after agent handback
- ✨ **Session Status Monitoring**: Tracks handoff state across page refreshes

#### New State Variables:
```typescript
const [handoffRequested, setHandoffRequested] = useState(false)
const [showHandoffDialog, setShowHandoffDialog] = useState(false)
const [handoffReason, setHandoffReason] = useState('')
```

#### Key Functions:
- `handleRequestHandoff()`: Manages the handoff request process
- ✨ **Real-time handback detection**: In message subscription
- ✨ **Session metadata monitoring**: Watches for handoff flag changes
- ✨ **Enhanced history loading**: Determines handoff state on page load
- Updates session metadata with handoff flags
- Sends system message to chat
- Optionally triggers n8n webhook

### 2. Admin Dashboard Enhancement (`admin-dashboard/app/dashboard/chats/`)

#### Chat Overview Page (`page.tsx`):
- **Support Agent Tab**: New "Support Queue" tab visible only to Support Agents
- **Pending Handoffs**: Displays sessions requiring human intervention
- **Priority Indicators**: Visual badges showing pending request count
- **Quick Actions**: "Take Over Chat" buttons for each pending session

#### Chat Detail Page (`[sessionId]/page.tsx`):
- **Handoff Context**: Visual indicators when handoff was requested
- **Agent Actions**: Enhanced agent interface with two buttons:
  - **Send Message**: Standard agent response
  - **Hand Back to Bot**: Returns conversation to chatbot
- **Status Display**: Shows handoff reason and request time

## Database Schema

### Session Metadata Structure
The implementation uses existing `chat_sessions.metadata` JSONB field with these new properties:

```json
{
  "handoff_requested": "true",
  "handoff_requested_at": "2025-01-18T10:30:00.000Z",
  "handoff_reason": "I need help with a complex technical issue",
  "had_human_intervention": true,
  "last_agent_id": "agent-uuid"
}
```

### Message Metadata Structure
Agent messages include special metadata:

```json
{
  "agent_intervention": true,
  "agent_id": "agent-uuid",
  "agent_email": "agent@company.com",
  "handback_to_bot": true  // Only for handback messages
}
```

## User Flow

### 1. Customer Requests Handoff
1. User clicks the handoff button (👤+) in chat widget
2. Optional dialog appears for reason input
3. System message appears: "You have requested to speak with a human agent..."
4. Chat widget shows "Support request sent" status
5. Handoff button is hidden (`handoffRequested = true`)
6. Session metadata updated with handoff flags

### 2. Support Agent Takes Over
1. Support Agent sees notification in "Support Queue" tab
2. Agent clicks "Take Over Chat" to open conversation
3. Agent sees full chat history and handoff context
4. Agent can send messages (marked with purple avatar)
5. Agent can hand back to bot when done

### 3. Hand Back to Bot ✨ **ENHANCED**
1. Agent clicks "Hand Back to Bot" button
2. System sends handback message with `handback_to_bot: true` metadata
3. **Chat widget automatically detects handback in real-time**
4. **Handoff button is automatically restored** (`handoffRequested = false`)
5. **User can request human support again** if needed
6. Conversation returns to normal bot operation

### 4. Subsequent Handoff Requests ✨ **NEW**
1. User can click handoff button again for additional help
2. Full cycle repeats as many times as needed
3. Complete conversation history is preserved throughout

## n8n Webhooks Required (Task 4.1)

The following n8n webhooks should be implemented to complete the integration:

### 1. Handoff Request Webhook
**Endpoint**: `POST /webhook/handoff-request`

**Purpose**: Notify support team when user requests human support

**Payload**:
```json
{
  "sessionId": "uuid",
  "chatbotId": "uuid", 
  "userIdentifier": "uuid",
  "reason": "User provided reason or 'User requested human support'",
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

**Expected Actions**:
- Send email/Slack notification to available support agents
- Update support dashboard/queue system
- Log handoff request for analytics
- Optionally integrate with ticketing system

### 2. Handback to Bot Webhook
**Endpoint**: `POST /webhook/handback-to-bot`

**Purpose**: Notify system when agent hands conversation back to bot

**Payload**:
```json
{
  "sessionId": "uuid",
  "chatbotId": "uuid",
  "agentId": "uuid",
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

**Expected Actions**:
- Log handback event for analytics
- Resume normal RAG workflow for the session
- Clear any agent-specific routing rules
- Update support metrics

### 3. Agent Availability Management
**Endpoint**: `POST /webhook/agent-status`

**Purpose**: Track agent availability for routing

**Payload**:
```json
{
  "agentId": "uuid",
  "status": "available|busy|offline",
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

## Role-Based Access Control

### Support Agent Role
- Can view "Support Queue" tab
- Can take over conversations
- Can send agent messages
- Can hand back to bot

### Super Admin/Chatbot Manager
- All Support Agent permissions
- Can view all chat sessions
- Can intervene in any conversation

### Other Roles
- Cannot see handoff queue
- Cannot intervene in conversations
- Read-only access to chat data

## Visual Indicators

### Chat Widget
- 🟠 Handoff request button (👤+)
- 🟡 "Support request sent" notification banner
- ⚪ System messages with handoff status

### Admin Dashboard
- 🔴 Badge count on "Support Queue" tab
- 🟠 Orange highlighting for pending handoff sessions
- 🟣 Purple avatar for agent messages
- 🔄 Pulsing indicator for active handoff requests

## Technical Notes

### Error Handling
- Graceful fallback if n8n webhooks fail
- User feedback for all handoff states
- Proper loading states during transitions

### Real-time Updates
- Uses Supabase real-time subscriptions
- Immediate UI updates for all parties
- Consistent state across sessions

### Security
- RBAC enforced at component level
- Session validation for all operations
- Agent identity tracked in all messages

## Future Enhancements

1. **Agent Routing**: Intelligent assignment based on skills/availability
2. **Queue Management**: Priority ordering and SLA tracking
3. **Chat Transfer**: Ability to transfer between agents
4. **Canned Responses**: Quick reply templates for agents
5. **Performance Metrics**: Response times and satisfaction tracking

## Testing Scenarios

1. **Basic Handoff**: User requests → Agent responds → Handback to bot
2. **Multiple Pending**: Several users request handoff simultaneously
3. **Agent Unavailable**: Handoff request when no agents online
4. **Session Transfer**: Moving conversation between agents
5. **Error Recovery**: Network failures during handoff process

This implementation provides a complete human handoff system that integrates seamlessly with the existing chatbot infrastructure while maintaining the n8n-first philosophy of the project.
