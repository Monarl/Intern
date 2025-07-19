# Chat Widget

A modern, embeddable chat widget built with Next.js 15, React, and Supabase for real-time messaging with enterprise chatbot integration.

## Features

- 🚀 **Real-time messaging** with Supabase Realtime
- 🎨 **Customizable appearance** (colors, position, themes)
- 📱 **Responsive design** for mobile and desktop
- 🔄 **Session persistence** with user identification
- 🤖 **n8n RAG integration** for AI-powered responses
- 📊 **Message history** with database persistence
- ⚡ **TypeScript** for type safety
- 🎯 **Embeddable** via iframe or direct integration

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook/rag-chat
```

### 3. Run Development Server

```bash
npm run dev
```

The widget will be available at `http://localhost:3001`

## Usage

### Direct Integration

```typescript
import { ChatWidget } from '@/components/ChatWidget'

function MyApp() {
  return (
    <ChatWidget
      chatbotId="your-chatbot-id"
      supabaseUrl="your-supabase-url"
      supabaseAnonKey="your-supabase-anon-key"
      n8nWebhookUrl="your-n8n-webhook-url"
      position="bottom-right"
      welcomeMessage="Hello! How can I help you today?"
      appearance={{
        primaryColor: "#3b82f6",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "12px"
      }}
    />
  )
}
```

### Embed via Script Tag

```html
<script>
window.ChatWidget.init({
  chatbotId: 'your-chatbot-id',
  widgetUrl: 'https://your-chat-widget-domain.com',
  n8nWebhookUrl: 'https://your-n8n-instance.com/webhook/rag-chat',
  position: 'bottom-right',
  welcomeMessage: 'Hello! How can I help you today?',
  appearance: {
    primaryColor: '#3b82f6'
  }
})
</script>
```

### Iframe Embedding

```html
<iframe 
  src="https://your-chat-widget-domain.com/embed?chatbotId=your-id&n8nWebhookUrl=your-webhook-url"
  width="400" 
  height="600"
  style="position: fixed; bottom: 20px; right: 20px; border: none; z-index: 999999;">
</iframe>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chatbotId` | string | Required | Unique identifier for the chatbot |
| `supabaseUrl` | string | Required | Supabase project URL |
| `supabaseAnonKey` | string | Required | Supabase anonymous key |
| `n8nWebhookUrl` | string | Required | n8n webhook endpoint for RAG processing |
| `position` | string | `'bottom-right'` | Widget position (`'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'`) |
| `welcomeMessage` | string | `'Hello! How can I help you today?'` | Initial message shown to users |
| `appearance.primaryColor` | string | `'#3b82f6'` | Primary color for buttons and user messages |
| `appearance.fontFamily` | string | `'system-ui, sans-serif'` | Font family for the widget |
| `appearance.borderRadius` | string | `'12px'` | Border radius for the widget |

## Database Schema

The widget requires these Supabase tables:

```sql
-- Chat sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID REFERENCES chatbots(id),
  session_id TEXT UNIQUE NOT NULL,
  user_identifier TEXT,
  platform TEXT DEFAULT 'web',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## n8n Integration

The widget sends requests to n8n in this format:

```json
{
  "message": "User's question",
  "sessionId": "session_1642234567890_abc123def",
  "chatbotId": "uuid-of-chatbot",
  "userIdentifier": "user_1642234567890_xyz789",
  "metadata": {
    "platform": "web",
    "timestamp": "2025-01-18T10:30:00.000Z"
  }
}
```

Expected response format:

```json
{
  "response": "AI assistant's response",
  "sessionId": "session_1642234567890_abc123def",
  "metadata": {
    "sources": ["document1.pdf", "document2.docx"],
    "confidence": 0.85,
    "handoffRequired": false
  }
}
```

## Development

### Build for Production

```bash
npm run build
```

### Type Check

```bash
npx tsc --noEmit
```

### Lint

```bash
npm run lint
```

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime subscriptions
- **Database**: Supabase PostgreSQL
- **AI Integration**: n8n workflows with RAG capabilities
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Type Safety**: TypeScript with strict configuration

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## License

MIT License - see LICENSE file for details.
