# Facebook Messenger Integration Documentation

## Overview

The Facebook Messenger integration allows your chatbot to automatically respond to messages sent to your Facebook Page. This integration supports multi-page management, webhook verification, message logging, and seamless integration with n8n workflows.

## Features

### Core Features
- **Automatic Message Response**: Chatbot automatically responds to Facebook Messenger messages
- **Multi-Page Support**: Manage multiple Facebook Pages from a single dashboard
- **Webhook Verification**: Secure webhook verification using Facebook's verification process
- **Message Logging**: Complete logging of all webhook events and message processing
- **n8n Integration**: Seamless integration with n8n workflows for advanced processing
- **Error Handling**: Comprehensive error handling and logging

### Security Features
- **Signature Verification**: All webhook requests are verified using Facebook App Secret
- **Access Token Management**: Secure storage and management of Page Access Tokens
- **User Authentication**: Integration respects user roles and permissions

## Database Schema

### facebook_pages Table
```sql
CREATE TABLE facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  page_id TEXT NOT NULL UNIQUE,
  page_access_token TEXT NOT NULL,
  app_id TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  verify_token TEXT NOT NULL,
  webhook_url TEXT,
  chatbot_id UUID REFERENCES chatbots(id),
  owner_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);
```

### facebook_webhook_logs Table
```sql
CREATE TABLE facebook_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT REFERENCES facebook_pages(page_id),
  event_type TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  message_text TEXT,
  timestamp_received BIGINT,
  webhook_payload JSONB NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
);
```

## API Endpoints

### Webhook Endpoint
- **URL**: `/api/webhooks/facebook`
- **Methods**: `GET` (verification), `POST` (message handling)
- **Purpose**: Handles Facebook webhook verification and incoming messages

### Management Endpoints
- **GET/POST/DELETE** `/api/integrations/facebook` - Manage Facebook page configurations
- **POST** `/api/integrations/facebook/test` - Test Facebook page connections

## Setup Guide

### Step 1: Facebook App Setup

1. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Click "My Apps" → "Create App"
   - Select "Business" as app type
   - Fill in app details (App Name, Contact Email)
   - Add "Messenger" product to your app

2. **Configure Messenger Product**
   - In App Dashboard, go to "Products" → "Messenger" → "Settings"
   - Scroll to "Create Access Tokens" section
   - Click "Add Pages" and connect your Facebook Page
   - Click "Generate Token" next to your page (this is your Page Access Token)
   - Copy and save this token (starts with "EAA...")

3. **Get App ID and App Secret**
   - In App Dashboard, go to "App Settings" → "Basic"
   - Copy your "App ID" (this is your Facebook App ID)
   - Click "Show" next to "App Secret" (this is your Facebook App Secret)
   - Save both values securely

### Step 2: Get Your Facebook Page ID

1. **Method 1: From Page Settings**
   - Go to your Facebook Page
   - Click "Settings" in the left sidebar
   - In the "General" tab, look for "Page ID"
   - Copy the numeric ID

2. **Method 2: From Added Page in Messenger Settings**
   - In App Dashboard, go to "Products" → "Messenger" → "Settings"
   - Scroll to "Create Access Tokens" section
   - Under the previous added page, you will see the Page ID listed

3. **Method 3: From URL**
   - Go to your Facebook Page
   - Look at the URL: `facebook.com/YourPageName-123456789`
   - The number at the end is your Page ID

### Step 2: Admin Dashboard Configuration

1. **Navigate to Integrations**
   - Go to Dashboard → Integrations → Facebook Messenger
   - Click "Add Facebook Page"

2. **Fill Configuration Form**
   ```
   - Display Name: Your page display name (e.g., "My Business Page")
   - Facebook Page ID: Your page ID (read step 2 above)
   - Page Access Token: Token generated in step 1 (starts with "EAA")
   - Facebook App ID: From your Facebook app → Settings → Basic
   - Facebook App Secret: From your Facebook app → Settings → Basic
   - Verify Token: Click "Generate Token" or create your own custom string
   - Linked Chatbot: Select which chatbot to use for responses
   ```

3. **Configure Settings**
   - Enable/disable automatic replies
   - Set welcome message
   - Set fallback message for unknown queries

4. **Get Webhook URL**
   - Copy the webhook URL displayed in the dashboard
   - This URL will be in format: `https://yourdomain.com/api/webhooks/facebook`
   - You'll need this URL for Facebook webhook configuration

5. **Test Connection**
   - Use the "Kiểm tra" (Test) button to verify your configuration
   - Check that all API connections are working

### Step 3: Webhook Verification

1. **Facebook Webhook Setup**
   - In Facebook App Dashboard, add the webhook URL
   - Use the verify token from your configuration
   - Subscribe to these fields: `messages`, `messaging_postbacks`
   - Click "Verify and Save"
   - Facebook will send a verification request to your webhook
   - The system will automatically respond with the challenge

2. **Subscribe to Page Events**
   - After webhook verification, subscribe your app to your page
   - This enables your app to receive messages from the page

## Message Flow

### Incoming Message Process

1. **Webhook Reception**
   - Facebook sends POST request to `/api/webhooks/facebook`
   - System verifies webhook signature using App Secret
   - Message is logged to `facebook_webhook_logs`

2. **Session Management**
   - System creates or retrieves existing chat session
   - Session is linked to Facebook sender ID and page
   - Platform is set to 'facebook'

3. **Message Processing**
   - User message is saved to `chat_messages` table
   - If chatbot has n8n webhook URL, message is sent to n8n workflow
   - n8n processes the message using RAG and knowledge base

4. **Response Handling**
   - n8n returns response to the system
   - Response is saved to `chat_messages` table
   - Response is sent back to Facebook user via Graph API

### n8n Integration Payload

The system sends the following payload to n8n:
```json
{
  "sessionId": "uuid",
  "message": "user message text",
  "userId": "facebook_user_id", 
  "platform": "facebook",
  "chatbotId": "chatbot_uuid",
  "knowledgeBaseIds": ["kb_uuid1", "kb_uuid2"],
  "config": {
    "welcome_message": "...",
    "fallback_message": "..."
  }
}
```

Expected n8n response:
```json
{
  "reply": "bot response text",
  "metadata": {
    "sources": ["document1", "document2"],
    "confidence": 0.85
  }
}
```

## Admin UI Components

### FacebookMessengerConfig Component
- **Location**: `/components/integrations/facebook-messenger-config.tsx`
- **Features**:
  - Create/edit Facebook page configurations
  - Test connections
  - Manage multiple pages
  - Advanced settings configuration

### Integration Pages
- **Main**: `/dashboard/integrations` - Overview of all integrations
- **Facebook**: `/dashboard/integrations/facebook` - Facebook-specific management

## Security Considerations

### Webhook Security
- All webhook requests are verified using HMAC-SHA256 signature
- Invalid signatures are rejected with 401 status
- App Secret is used for signature verification

### Data Protection
- Access tokens are stored securely in database
- User authentication required for all management operations
- Row-level security ensures users can only access their own configurations

### Error Handling
- All errors are logged with appropriate detail levels
- Failed webhook processing is tracked in logs
- Connection test results provide diagnostic information

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check verify token matches exactly
   - Ensure webhook URL is accessible
   - Verify HTTPS is working properly

2. **Messages Not Being Received**
   - Check page subscription status
   - Verify webhook events are subscribed
   - Check Facebook app permissions

3. **API Errors**
   - Verify Page Access Token is valid and not expired
   - Check App ID and Secret are correct
   - Ensure page is linked to the app

4. **Bot Not Responding**
   - Check chatbot is active and linked
   - Verify n8n webhook URL is accessible
   - Check chat session creation in database

### Testing Tools

1. **Connection Test**
   - Use built-in test function in admin dashboard
   - Checks page info, webhook status, and permissions

2. **Webhook Logs**
   - Check `facebook_webhook_logs` table for processing status
   - Look for error messages in logs

3. **Facebook Developer Tools**
   - Use Facebook's webhook testing tools
   - Check app permissions and status

## Environment Variables

Required environment variables in `.env.local`:
```env
# Supabase (required for database access)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: For development/testing
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

## Limitations

1. **Facebook API Limits**
   - Subject to Facebook's rate limiting
   - Message delivery may be delayed during high traffic

2. **Supported Message Types**
   - Currently supports text messages only
   - Image, video, and other media types not yet supported

3. **Page Requirements**
   - Facebook Page must be published and active
   - Page must be linked to a Facebook Business account

## Future Enhancements

1. **Rich Media Support**
   - Image and video message handling
   - Quick replies and buttons
   - Carousel and template messages

2. **Advanced Features**
   - Message templates management
   - Broadcast messaging
   - User profile information integration

3. **Analytics**
   - Message volume and response time metrics
   - User engagement analytics
   - Performance monitoring

## Support

For issues and questions:
1. Check the webhook logs in the database
2. Use the connection test feature
3. Review Facebook Developer documentation
4. Check n8n workflow logs if messages aren't being processed

## Troubleshooting

### Common Issues

#### 1. "Không thể xác thực URL gọi lại hoặc mã xác minh" (Cannot verify callback URL)
**Symptoms**: Facebook shows error when trying to verify webhook URL
**Solutions**:
- Ensure your admin dashboard is running on HTTPS (not HTTP)
- Make sure the webhook URL is accessible from the internet (use ngrok for local development)
- Verify that the verify token matches exactly between Facebook and your dashboard
- Check that your server is responding to GET requests at the webhook URL

#### 2. No chatbots showing in dropdown
**Symptoms**: "Linked Chatbot" dropdown is empty
**Solutions**:
- Make sure you have created at least one chatbot in the dashboard
- Check that you are logged in as the same user who created the chatbots
- Verify the chatbots are owned by your user account

#### 3. App Secret not found
**Location**: Facebook Developer Dashboard → Your App → Settings → Basic → App Secret
**Note**: Click "Show" button to reveal the secret, you may need to re-enter your Facebook password

#### 4. Page Access Token expired
**Symptoms**: API calls fail with authentication errors
**Solutions**:
- Page Access Tokens can expire, especially if page permissions change
- Generate a new token in Facebook Developer Dashboard → Messenger → Settings → Access Tokens
- Update the token in your dashboard configuration

#### 5. Webhook verification fails
**Common causes**:
- **URL not accessible**: Ensure your webhook URL is publicly accessible
- **Wrong verify token**: The token in Facebook must match the one in your dashboard
- **Server not running**: Make sure your admin dashboard is running
- **HTTPS required**: Facebook requires HTTPS for webhook URLs

#### 6. Local Development Setup
For local development, use ngrok to create a public URL:
```bash
# Install ngrok
npm install -g ngrok

# Start your admin dashboard (usually on port 3000)
npm run dev

# In another terminal, create public tunnel
ngrok http 3000

# Use the HTTPS URL from ngrok as your webhook URL
# Example: https://abc123.ngrok.io/api/webhooks/facebook
```

This integration follows Facebook's Messenger Platform best practices and maintains compatibility with the existing chatbot system architecture.