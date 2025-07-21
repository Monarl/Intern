# Chat Management Interface Documentation

This document explains the implementation of the chat management interface in the admin dashboard of the Enterprise Chatbot System. The interface allows administrators and support staff to view, manage, and intervene in chat sessions based on their assigned roles.

## Table of Contents

1. [Overview](#overview)
2. [Components](#components)
3. [Data Flow](#data-flow)
4. [Role-Based Access Control](#role-based-access-control)
5. [Real-time Functionality](#real-time-functionality)
6. [Integration with Chat Widget](#integration-with-chat-widget)
7. [Technical Details](#technical-details)

## Overview

The chat management interface consists of two main pages:

1. **Chat Overview Page** (`page.tsx`): Displays statistics, a list of all chat sessions, and analytics data
2. **Chat Detail Page** (`[sessionId]/page.tsx`): Shows individual chat session details with the ability to send messages as an agent

Both pages implement role-based access control to ensure that only authorized users can access specific features.

## Components

### Chat Overview Page

The Chat Overview page is organized into three main tabs:

1. **Overview Tab**: Displays key statistics and metrics
   - Total Sessions
   - Active Sessions
   - Messages Today
   - Average Response Time

2. **Chat Sessions Tab**: Lists all chat sessions with:
   - Session ID
   - Platform (website, Facebook, etc.)
   - User Identifier
   - Status (active, ended, failed)
   - Creation Date
   - Last Activity
   - Message Count

3. **Analytics Tab**: Shows visualizations and trends of chat data
   - User engagement metrics
   - Session volume by time period
   - Common user queries and topics

### Chat Detail Page

The Chat Detail page includes:

1. **Session Information**: Displays metadata about the chat session
   - Session ID
   - Chatbot Name
   - Platform
   - User Identifier
   - Creation Time
   - Status

2. **Message History**: Shows the complete chat history with proper formatting
   - User messages (blue bubbles)
   - Chatbot responses (grey bubbles)
   - Agent interventions (purple bubbles)

3. **Agent Actions**:
   - Real-time message monitoring
   - Ability to send messages as an agent
   - Take over conversation functionality

## Data Flow

### Data Fetching

#### Chat Overview Page

The chat overview page fetches data in several stages:

1. **Session Data**:
   ```typescript
   const { data: sessionData, error: sessionError } = await supabase
     .from('chat_sessions')
     .select(`
       *,
       chatbots(name)
     `)
     .order('updated_at', { ascending: false })
     .limit(20)
   ```

2. **Message Count for Each Session**:
   ```typescript
   const sessionsWithCounts = await Promise.all(
     (sessionData || []).map(async (session: ChatSession) => {
       const { count, error: countError } = await supabase
         .from('chat_messages')
         .select('*', { count: 'exact', head: true })
         .eq('session_id', session.session_id)
       
       // Return session with count
       return {
         ...session,
         chatbot_name: session.chatbots?.name || 'Unknown',
         message_count: count || 0
       }
     })
   )
   ```

3. **Analytics Data**:
   ```typescript
   // Get today's date for filtering
   const today = new Date()
   today.setHours(0, 0, 0, 0)
   
   // Total sessions count
   const { count: totalSessions } = await supabase
     .from('chat_sessions')
     .select('*', { count: 'exact', head: true })
   
   // Active sessions count
   const { count: activeSessions } = await supabase
     .from('chat_sessions')
     .select('*', { count: 'exact', head: true })
     .eq('status', 'active')
   
   // Messages sent today
   const { count: messagesToday } = await supabase
     .from('chat_messages')
     .select('*', { count: 'exact', head: true })
     .gte('created_at', today.toISOString())
   ```

#### Chat Detail Page

The chat detail page fetches:

1. **Session Details**:
   ```typescript
   const { data: sessionData, error: sessionError } = await supabase
     .from('chat_sessions')
     .select(`
       *,
       chatbots(name)
     `)
     .eq('session_id', sessionId)
     .single()
   ```

2. **Chat Messages**:
   ```typescript
   const { data: messagesData, error: messagesError } = await supabase
     .from('chat_messages')
     .select('*')
     .eq('session_id', sessionId)
     .order('created_at', { ascending: true })
   ```

## Role-Based Access Control

The interface implements role-based access control to restrict functionality based on user roles:

1. **Super Admin**: Full access to all features
2. **Chatbot Manager**: Can view all chats and intervene in conversations
3. **Analyst/Reporter**: Can view chats and analytics but cannot intervene
4. **Support Agent**: Can view and intervene in conversations but has limited access to analytics

Implementation:
```typescript
// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager', 'Analyst/Reporter', 'Support Agent']
const INTERVENTION_ALLOWED = ['Super Admin', 'Chatbot Manager', 'Support Agent']

// Check if user has access
const hasAccess = ALLOWED_ROLES.includes(userRole as string)
const canIntervene = INTERVENTION_ALLOWED.includes(userRole as string)
```

## Real-time Functionality

Real-time updates are implemented using Supabase Realtime subscriptions:

```typescript
// Set up real-time subscription if session is active
if (isRealtime && sessionData.status === 'active') {
  const channel = supabase
    .channel(`chat_messages_${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload: { new: ChatMessage }) => {
        console.log('Real-time message received:', payload)
        const newMessage = payload.new
        setMessages((prev) => [...prev, newMessage])
      }
    )
    .subscribe()
  
  setRealTimeConnection(channel)
}
```

This allows the interface to:
- Display new messages in real time
- Update session status without page refresh
- Show active user typing indicators (if implemented)

## Integration with Chat Widget

The admin chat interface is designed to work seamlessly with the chat widget:

1. **Shared Database Schema**: Both components use the same Supabase tables:
   - `chat_sessions`: Stores session metadata
   - `chat_messages`: Stores all messages in the conversation
   - `chatbots`: Contains chatbot configuration

2. **Communication Flow**:
   - Chat widget sends messages to the `chat_messages` table
   - n8n workflow processes messages and generates responses
   - Admin interface displays messages and allows agent intervention
   - Agent responses are added to the same table with special metadata

3. **Agent Intervention**:
   When an agent sends a message through the admin interface:

   ```typescript
   // Insert agent message
   const { error: messageError } = await supabase
     .from('chat_messages')
     .insert({
       session_id: sessionId,
       role: 'assistant', // Sent as assistant (bot), but with agent flag
       content: agentMessage,
       metadata: {
         agent_intervention: true,
         agent_id: user?.id,
         agent_email: user?.email
       }
     })
   
   // Update session metadata to mark human intervention
   const { error: updateError } = await supabase
     .from('chat_sessions')
     .update({
       updated_at: new Date().toISOString(),
       metadata: {
         ...session?.metadata,
         had_human_intervention: true,
         last_agent_id: user?.id
       }
     })
     .eq('session_id', sessionId)
   ```

## Technical Details

### Fixes and Improvements

1. **TypeScript Type Safety**:
   - Added proper interfaces for message and session metadata
   - Replaced `any` types with more specific types or `unknown`
   - Added proper error handling with TypeScript typing

2. **React Hook Fixes**:
   - Fixed React hook dependency arrays
   - Ensured Supabase client is properly extracted from context
   - Fixed issues with hook usage in event handlers

3. **Supabase Client Usage**:
   - Updated the chat session detail page to use Supabase client from context
   - Fixed real-time subscription setup and cleanup

4. **Error Handling**:
   - Added proper error handling throughout the application
   - Improved error messages for better debugging
   - Added logging for critical operations

5. **UI Improvements**:
   - Added loading states with skeletons
   - Implemented proper formatting for timestamps
   - Added UI feedback for agent actions

### Database Schema

The chat functionality relies on the following tables:

1. **chat_sessions**:
   - `session_id` (primary key)
   - `user_identifier`
   - `chatbot_id` (foreign key to chatbots table)
   - `platform`
   - `status` ('active', 'ended', 'failed')
   - `created_at`
   - `updated_at`
   - `metadata` (JSONB)

2. **chat_messages**:
   - `message_id` (primary key)
   - `session_id` (foreign key to chat_sessions)
   - `role` ('user', 'assistant', 'system')
   - `content`
   - `created_at`
   - `metadata` (JSONB)

3. **chatbots**:
   - `id` (primary key)
   - `name`
   - Other configuration fields

These tables are secured with Supabase RLS policies to ensure proper access control.
