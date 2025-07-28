# Chat Widget Integration Guide

This guide explains how to use the Chat Widget preview in the admin dashboard after resolving the import issues.

## Solution Overview

Instead of importing the ChatWidget component directly (which caused cross-directory import issues), we now use an **iframe-based preview system** that embeds the chat widget from its own Next.js application.

## Architecture

```
admin-dashboard (port 3000)  →  chat-widget (port 3001)
     ↓                              ↓
ChatWidgetPreview.tsx       →   /embed endpoint
     ↓                              ↓
     iframe                  →   ChatWidget.tsx
```

## Components

### 1. `ChatWidgetPreview.tsx`
- Located: `admin-dashboard/components/chatbots/ChatWidgetPreview.tsx`
- Purpose: Renders an iframe that loads the chat widget from the separate chat-widget application
- Features:
  - Live preview updates when configuration changes
  - Error handling with fallback UI
  - Loading states
  - Configuration display overlay

### 2. Chat Widget Embed Endpoint
- Located: `chat-widget/src/app/embed/page.tsx`
- Purpose: Provides an embeddable endpoint for the chat widget
- URL: `http://localhost:3001/embed?chatbotId=...&n8nWebhookUrl=...`

## Setup Instructions

### 1. Environment Variables

Add to your `.env.local` file:

```env
# Chat Widget Configuration
NEXT_PUBLIC_CHAT_WIDGET_URL=http://localhost:3001
```

### 2. Start Both Applications

```bash
# Terminal 1: Start the chat widget
cd chatbot-enterprise/chat-widget
npm install
npm run dev

# Terminal 2: Start the admin dashboard
cd chatbot-enterprise/admin-dashboard
npm install
npm run dev
```

### 3. Verify Integration

1. Open admin dashboard: `http://localhost:3000`
2. Navigate to chatbot edit page
3. Check that the preview iframe loads the chat widget from port 3001

## Query Parameters

The embed URL accepts these parameters:

- `chatbotId` (required): Unique identifier for the chatbot
- `n8nWebhookUrl` (required): n8n webhook endpoint
- `position`: Widget position (`bottom-right`, `bottom-left`, `top-right`, `top-left`)
- `welcomeMessage`: Initial greeting message
- `knowledgeBaseIds`: Comma-separated list of knowledge base IDs
- `appearance`: URL-encoded JSON object with styling configuration

Example URL:
```
http://localhost:3001/embed?chatbotId=123&n8nWebhookUrl=http://localhost:5678/webhook/rag-chat&position=bottom-right&welcomeMessage=Hello!&knowledgeBaseIds=kb1,kb2&appearance=%7B%22primaryColor%22%3A%22%233b82f6%22%7D
```

## Error Handling

### Iframe Load Failures
- If the iframe fails to load, the component automatically falls back to a static mockup
- Loading spinner shows while iframe is loading
- Error states are handled gracefully

### Missing Environment Variables
- Defaults to `http://localhost:3001` if `NEXT_PUBLIC_CHAT_WIDGET_URL` is not set
- Shows error message if required parameters are missing

## Benefits of This Approach

1. **Separation of Concerns**: Each app runs independently
2. **No Import Issues**: Avoids Next.js cross-directory import problems  
3. **Real Preview**: Shows actual widget behavior, not just a mockup
4. **Easy Embedding**: Same endpoint can be used for external websites
5. **Error Resilience**: Graceful fallbacks when preview is unavailable

## Development Tips

### Hot Reloading
- Changes to chat widget code will hot-reload in the preview iframe
- Configuration changes in admin dashboard immediately update the iframe URL

### Debugging
- Use browser dev tools to inspect the iframe content
- Check network tab for iframe loading issues
- Chat widget logs appear in the iframe's console context

### Production Deployment
- Set `NEXT_PUBLIC_CHAT_WIDGET_URL` to your production chat widget domain
- Ensure both applications are deployed and accessible
- Configure CORS settings if needed

## Troubleshooting

### Preview Not Loading
1. Check that chat-widget is running on port 3001
2. Verify `NEXT_PUBLIC_CHAT_WIDGET_URL` environment variable
3. Check browser console for iframe errors

### Configuration Not Updating
1. Clear browser cache
2. Check that iframe key is incrementing (forces reload)
3. Verify query parameters are being encoded correctly

### CORS Issues
1. Ensure both apps are on localhost for development
2. For production, configure appropriate CORS headers
3. Check iframe sandbox permissions

## Future Enhancements

- Add preview size options (mobile, tablet, desktop)
- Include website mockup backgrounds
- Add preview for different widget states (open, closed, typing)
- Implement real-time preview updates via WebSocket
