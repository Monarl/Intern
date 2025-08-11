import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/app/lib/supabase/server';

// Facebook Messenger webhook verification and message handling
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Webhook verification
  if (mode === 'subscribe') {
    // Find the Facebook page with matching verify token
    // Use admin client to bypass RLS since webhooks don't have user context
    const supabase = await createAdminClient();
    
    const { data: page, error } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('verify_token', token)
      .eq('is_active', true)
      .single();

    if (error || !page) {
      console.error('Facebook webhook verification failed:', error);
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }

    console.log('Facebook webhook verified for page:', page.name);
    return new NextResponse(challenge);
  }

  return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
    }

    const body = await request.text();
    const data = JSON.parse(body);

    // Verify webhook signature for security
    const isValid = await verifyWebhookSignature(body, signature, data);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process webhook events
    if (data.object === 'page') {
      for (const entry of data.entry) {
        const pageId = entry.id;
        
        // Handle messaging events
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await handleMessagingEvent(pageId, event);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Facebook webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function verifyWebhookSignature(body: string, signature: string, data: Record<string, unknown>): Promise<boolean> {
  const supabase = await createAdminClient();
  
  // Get the page ID from webhook data
  const entry = data.entry as Array<{ id: string }> | undefined;
  const pageId = entry?.[0]?.id;
  if (!pageId) return false;

  // Find the Facebook page configuration
  const { data: page, error } = await supabase
    .from('facebook_pages')
    .select('app_secret')
    .eq('page_id', pageId)
    .eq('is_active', true)
    .single();

  if (error || !page) {
    console.error('Failed to find Facebook page config:', error);
    return false;
  }

  // Verify signature
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', page.app_secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text: string;
  };
}

async function handleMessagingEvent(pageId: string, event: MessagingEvent) {
  const supabase = await createAdminClient();
  
  try {
    // Log the webhook event
    await supabase.from('facebook_webhook_logs').insert({
      page_id: pageId,
      event_type: event.message ? 'message' : 'other',
      sender_id: event.sender?.id || '',
      recipient_id: event.recipient?.id || '',
      message_text: event.message?.text || null,
      timestamp_received: event.timestamp,
      webhook_payload: event,
      processing_status: 'pending'
    });

    // Only process text messages for now
    if (event.message && event.message.text) {
      await processMessage(pageId, event);
    }
  } catch (error) {
    console.error('Error handling messaging event:', error);
    
    // Update log with error
    await supabase.from('facebook_webhook_logs').insert({
      page_id: pageId,
      event_type: 'error',
      sender_id: event.sender?.id || '',
      recipient_id: event.recipient?.id || '',
      webhook_payload: event,
      processing_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processMessage(pageId: string, event: MessagingEvent) {
  const supabase = await createAdminClient();
  const senderId = event.sender.id;
  const messageText = event.message?.text;

  if (!messageText) {
    throw new Error('No message text found');
  }

  try {
    // Get Facebook page configuration and associated chatbot
    const { data: page, error: pageError } = await supabase
      .from('facebook_pages')
      .select(`
        *,
        chatbots (
          id,
          name,
          n8n_webhook_url,
          knowledge_base_ids,
          config,
          is_active
        )
      `)
      .eq('page_id', pageId)
      .eq('is_active', true)
      .single();

    if (pageError || !page) {
      console.error('Facebook page lookup error:', pageError);
      throw new Error(`Facebook page not found or inactive: ${pageError?.message || 'Unknown error'}`);
    }

    if (!page.chatbots || !page.chatbots.is_active) {
      throw new Error('No active chatbot configured for this Facebook page');
    }

    const chatbot = page.chatbots;
    console.log('Processing message for chatbot:', chatbot.name, 'from user:', senderId);

    // Create or get existing chat session for this Facebook user
    let session;
    const { data: existingSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_identifier', senderId)
      .eq('platform', 'facebook')
      .eq('chatbot_id', chatbot.id)
      .eq('status', 'active')
      .single();

    if (sessionError || !existingSession) {
      // Create new session with a generated UUID for session_id
      const sessionId = crypto.randomUUID();
      console.log('Creating new chat session with ID:', sessionId, 'for user:', senderId);
      
      const { data: newSession, error: newSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          chatbot_id: chatbot.id,
          user_identifier: senderId,
          platform: 'facebook',
          status: 'active',
          metadata: {
            page_id: pageId,
            page_name: page.name,
            facebook_user_id: senderId
          }
        })
        .select()
        .single();

      if (newSessionError || !newSession) {
        console.error('Failed to create chat session:', newSessionError);
        throw new Error(`Failed to create chat session: ${newSessionError?.message || 'Unknown error'}`);
      }
      console.log('Successfully created session:', newSession.session_id);
      session = newSession;
    } else {
      console.log('Using existing session:', existingSession.session_id);
      session = existingSession;
    }

    // Save user message
    await supabase.from('chat_messages').insert({
      session_id: session.session_id,
      role: 'user',
      content: messageText,
      metadata: {
        platform: 'facebook',
        sender_id: senderId,
        facebook_message_id: event.message?.mid || ''
      }
    });

    // Send message to n8n workflow for processing
    if (chatbot.n8n_webhook_url) {
      console.log('Sending message to n8n:', chatbot.n8n_webhook_url);
      
      const n8nPayload = {
        message: messageText,
        sessionId: session.session_id,
        chatbotId: chatbot.id,
        userIdentifier: senderId,
        metadata: {
          platform: 'facebook',
          timestamp: new Date().toISOString(),
          page_id: pageId,
          facebook_message_id: event.message?.mid || ''
        },
        knowledgeBaseIds: chatbot.knowledge_base_ids || [],
        config: chatbot.config || {}
      };

      const response = await fetch(chatbot.n8n_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('n8n response received:', responseData);
        
        // Save bot response - handle both 'reply' and 'response' fields for compatibility
        const botResponse = responseData.reply || responseData.response;
        if (botResponse) {
          await supabase.from('chat_messages').insert({
            session_id: session.session_id,
            role: 'assistant',
            content: botResponse,
            metadata: {
              platform: 'facebook',
              n8n_response: responseData
            }
          });

          // Send response back to Facebook Messenger
          console.log('Sending response to Facebook:', botResponse);
          await sendFacebookMessage(page.page_access_token, senderId, botResponse);
        }
      } else {
        console.error('n8n webhook request failed:', response.status, await response.text());
        // Send a fallback message if n8n fails
        const fallbackMessage = page.settings?.fallback_message || 'Sorry, I am experiencing technical difficulties. Please try again later.';
        await sendFacebookMessage(page.page_access_token, senderId, fallbackMessage);
      }
    }

    // Update webhook log as processed
    await supabase
      .from('facebook_webhook_logs')
      .update({ processing_status: 'processed' })
      .eq('page_id', pageId)
      .eq('sender_id', senderId)
      .eq('timestamp_received', event.timestamp);

  } catch (error) {
    console.error('Error processing Facebook message:', error);
    
    // Update webhook log with error
    await supabase
      .from('facebook_webhook_logs')
      .update({ 
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('page_id', pageId)
      .eq('sender_id', senderId)
      .eq('timestamp_received', event.timestamp);
      
    throw error;
  }
}

async function sendFacebookMessage(pageAccessToken: string, recipientId: string, message: string) {
  try {
    console.log('Attempting to send Facebook message to:', recipientId);
    console.log('Message content:', message);
    console.log('Using access token:', pageAccessToken.substring(0, 20) + '...');
    
    const facebookApiBase = process.env.FACEBOOK_GRAPH_API_BASE_URL || 'https://graph.facebook.com'
    const facebookApiVersion = process.env.FACEBOOK_API_VERSION || 'v18.0'
    const response = await fetch(`${facebookApiBase}/${facebookApiVersion}/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pageAccessToken}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: 'RESPONSE'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook API error response:', errorData);
      throw new Error(`Facebook API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('Facebook message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending Facebook message:', error);
    throw error;
  }
}