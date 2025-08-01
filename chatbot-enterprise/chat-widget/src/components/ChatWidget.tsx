'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Minimize2, Bot, User, UserPlus } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { generateSessionId, generateUserIdentifier, formatTime, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { ChatMessage, ChatSession, ChatWidgetConfig, N8nChatRequest, N8nChatResponse } from '@/types/chat'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function ChatWidget({
  chatbotId,
  supabaseUrl,
  supabaseAnonKey,
  n8nWebhookUrl,
  platform = 'web',
  knowledgeBaseIds = [],
  appearance = {},
  position = 'bottom-right',
  welcomeMessage = 'Hello! How can I help you today?'
}: ChatWidgetConfig) {
  /* ────────────── state ────────────── */
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [userIdentifier, setUserIdentifier] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [chatbotActive, setChatbotActive] = useState<boolean | null>(null)
  const [inactiveMessage, setInactiveMessage] = useState<string>('This chatbot is currently inactive. Please try again later.')
  const [showInactiveNotification, setShowInactiveNotification] = useState(false)
  const [handoffRequested, setHandoffRequested] = useState(false)
  const [showHandoffDialog, setShowHandoffDialog] = useState(false)
  const [handoffReason, setHandoffReason] = useState('')
  
  /* ────────────── refs ────────────── */
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const prevSessionRef = useRef<string | null>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  /* ────────────── Supabase client ────────────── */
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      supabaseRef.current = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    }
  }, [supabaseUrl, supabaseAnonKey])

  /* ────────────── check chatbot status ────────────── */
  const checkChatbotStatus = useCallback(async () => {
    if (!supabaseRef.current || !chatbotId) {
      console.log('checkChatbotStatus: Missing supabase client or chatbotId', { 
        hasSupabase: !!supabaseRef.current, 
        chatbotId 
      });
      return false;
    }

    try {
      console.log('Checking chatbot status for ID:', chatbotId);
      
      const { data, error } = await supabaseRef.current
        .from('chatbots')
        .select('is_active')
        .eq('id', chatbotId)
        .maybeSingle();

      console.log('Chatbot status query result:', { data, error });

      if (error) {
        console.error('Error checking chatbot status:', error);
        setChatbotActive(false);
        return false;
      }

      const isActive = data?.is_active ?? false;
      console.log('Chatbot is_active status:', isActive);
      setChatbotActive(isActive);
      return isActive;
    } catch (err) {
      console.error('Failed to check chatbot status:', err);
      setChatbotActive(false);
      return false;
    }
  }, [chatbotId]);

  /* ────────────── initialize chatbot status check ────────────── */
  useEffect(() => {
    if (supabaseRef.current && chatbotId) {
      checkChatbotStatus();
    }
  }, [supabaseRef.current, chatbotId, checkChatbotStatus]);

  /* ────────────── real-time chatbot status subscription ────────────── */
  useEffect(() => {
    if (!supabaseRef.current || !chatbotId) return;

    console.log('Setting up real-time subscription for chatbot status:', chatbotId);
    
    const statusChannel = supabaseRef.current
      .channel(`chatbot_status_${chatbotId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatbots',
          filter: `id=eq.${chatbotId}`,
        },
        (payload) => {
          console.log('Real-time chatbot status update received:', payload);
          const updatedChatbot = payload.new as any;
          const newActiveStatus = updatedChatbot.is_active;
          
          console.log('Chatbot status changed to:', newActiveStatus);
          setChatbotActive(newActiveStatus);
          
          // If chatbot becomes inactive while chat is open, show notification
          if (!newActiveStatus && isOpen) {
            setShowInactiveNotification(true);
            setTimeout(() => {
              setShowInactiveNotification(false);
            }, 4000);
          }
          
          // If chatbot becomes active, hide any existing notification
          if (newActiveStatus && showInactiveNotification) {
            setShowInactiveNotification(false);
          }
        }
      )
      .subscribe((status) => {
        console.log('Chatbot status subscription status:', status);
      });

    return () => {
      console.log('Cleaning up chatbot status subscription');
      supabaseRef.current?.removeChannel(statusChannel);
    };
  }, [chatbotId, isOpen, showInactiveNotification]);

  /* ────────────── helper: metadata ────────────── */
  const getSessionMeta = useCallback(async (sid: string) => {
    if (!supabaseRef.current) return {};
    
    const { data, error } = await supabaseRef.current
      .from('chat_sessions')
      .select('metadata')
      .eq('session_id', sid)
      .single();
      
    if (error || !data) return {};
    return data.metadata || {};
  }, []);

  /* ────────────── mark inactive & purge history ────────────── */
  const markSessionInactive = useCallback(
    async (sid: string, reason = 'user_left') => {
      if (!supabaseRef.current || !sid) return;

      console.log('[ChatWidget] Marking session inactive →', sid);

      try {
        // 1. Update chat_sessions
        const meta = await getSessionMeta(sid);
        const { error: updErr } = await supabaseRef.current
          .from('chat_sessions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            metadata: {
              ...meta,
              session_ended_at: new Date().toISOString(),
              session_end_reason: reason,
            },
          })
          .eq('session_id', sid);

        if (updErr) console.error('Failed to update chat_sessions:', updErr);

        // 2. Delete n8n_chat_histories
        const { error: delErr } = await supabaseRef.current
          .from('n8n_chat_histories')
          .delete()
          .eq('session_id', sid);

        if (delErr) console.error('Failed to delete n8n history:', delErr);
        else console.log('n8n_chat_histories cleared for', sid);
      } catch (err) {
        console.error('Session cleanup error:', err);
      }
    },
    [getSessionMeta]
  );

  /* ────────────── graceful unload (pagehide) ────────────── */
  useEffect(() => {
    const handler = () => {
      if (!sessionId || !supabaseAnonKey) return;
      
      try {
        // Use direct markSessionInactive function if possible
        if (typeof markSessionInactive === 'function') {
          markSessionInactive(sessionId, 'browser_closed');
          return;
        }
        
        // Fallback to direct API call with proper URL format
        fetch(
          `${supabaseUrl}/rest/v1/chat_sessions?session_id=eq.${encodeURIComponent(sessionId)}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              status: 'completed',
              updated_at: new Date().toISOString(),
              metadata: {
                session_ended_at: new Date().toISOString(),
                session_end_reason: 'browser_closed',
              },
            }),
            keepalive: true,
          }
        );
      } catch (err) {
        // We can't log this error because the page is unloading,
        // but catching to prevent uncaught promise rejections
      }
    };
    
    // Use pagehide instead of beforeunload for more reliable cleanup
    window.addEventListener('pagehide', handler);
    
    return () => {
      window.removeEventListener('pagehide', handler);
      
      // When component unmounts (user navigates away), mark session inactive
      if (sessionId) {
        markSessionInactive(sessionId);
      }
    };
  }, [sessionId, supabaseUrl, supabaseAnonKey, markSessionInactive]);

  /* ────────────── check for and close active sessions ────────────── */
  const closeActiveSessions = useCallback(async (currentUserId: string) => {
    if (!supabaseRef.current) return;
    
    try {
      // Find any active sessions for this user
      const { data, error } = await supabaseRef.current
        .from('chat_sessions')
        .select('session_id')
        .eq('user_identifier', currentUserId)
        .eq('status', 'active');
        
      if (error) {
        console.error('Error checking for active sessions:', error);
        return;
      }
      
      // Mark all found sessions as inactive
      if (data && data.length > 0) {
        console.log(`Found ${data.length} active sessions to mark as inactive`);
        
        for (const session of data) {
          await markSessionInactive(session.session_id, 'new_session');
        }
      }
    } catch (err) {
      console.error('Error closing active sessions:', err);
    }
  }, [markSessionInactive]);

  /* ────────────── allocate local session id ────────────── */
  useEffect(() => {
    const initSession = async () => {
      if (!sessionId && supabaseRef.current) {
        try {
          // Get or create user identifier (could check localStorage first)
          const newUserIdentifier = generateUserIdentifier();
          
          console.log('Generated user identifier:', newUserIdentifier);
          
          // Close any existing active sessions for this user
          if (newUserIdentifier) {
            await closeActiveSessions(newUserIdentifier);
          }
          
          // Then create a new session
          const newSessionId = generateSessionId();
          setSessionId(newSessionId);
          setUserIdentifier(newUserIdentifier);
          
          // Store the new session ID for future reference
          prevSessionRef.current = newSessionId;
          console.log('New session initialized:', newSessionId);
        } catch (err) {
          console.error('Error initializing session:', err);
        }
      }
    };
    
    initSession();
  }, [sessionId, supabaseRef, closeActiveSessions]);

  /* ────────────── create chat_sessions row (checking first) ────────────── */
  const createChatSession = useCallback(async () => {
    if (!supabaseRef.current || !sessionId || !userIdentifier) return;

    try {
      // First check if the session already exists
      const { data: existingSession, error: checkError } = await supabaseRef.current
        .from('chat_sessions')
        .select('session_id, status')
        .eq('session_id', sessionId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors
        
      if (checkError) {
        console.error('Error checking chat session:', checkError);
        return;
      }
      
      if (existingSession) {
        console.log('Session already exists, not creating a new one');
        
        // If session exists but is marked as completed, update it to active
        if (existingSession.status === 'completed') {
          const { error: updateError } = await supabaseRef.current
            .from('chat_sessions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId);
            
          if (updateError) {
            console.error('Error updating existing session to active:', updateError);
          }
        }
        return;
      }
      
      // Create new session if it doesn't exist
      const { error: insertError } = await supabaseRef.current
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          chatbot_id: chatbotId,
          user_identifier: userIdentifier,
          platform: platform,
          status: 'active',
          metadata: {
            widget_position: position,
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString()
          }
        });

      if (insertError) {
        console.error('Error creating chat session:', insertError);
      } else {
        console.log('Chat session created successfully:', sessionId);
      }
    } catch (err) {
      console.error('Failed to create chat session:', err);
    }
  }, [sessionId, userIdentifier, chatbotId, platform, position]);

  /* ────────────── realtime subscription ────────────── */
  useEffect(() => {
    if (!supabaseRef.current || !sessionId) return;

    console.log('Setting up real-time subscription for session:', sessionId);
    
    // Add any existing messages to our processed set
    messages.forEach(msg => {
      if (msg.id) processedIdsRef.current.add(msg.id);
    });

    const channel = supabaseRef.current
      .channel(`chat_messages_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Real-time message received:', payload);
          const newMessage = payload.new as any;
          
          // Skip if we've already processed this message
          if (processedIdsRef.current.has(newMessage.id)) {
            console.log('Skipping already processed message:', newMessage.id);
            return;
          }
          
          // Add to processed set
          processedIdsRef.current.add(newMessage.id);
          
          if (newMessage.role === 'assistant') {
            console.log('Adding assistant message from real-time:', newMessage.content);
            
            // Check if this is a handback message from an agent
            if (newMessage.metadata?.handback_to_bot === true) {
              console.log('Detected handback message, restoring handoff button');
              setHandoffRequested(false);
            }
            
            setMessages(prev => {
              if (prev.some(msg => msg.id === newMessage.id)) {
                console.log('Message already in state, skipping:', newMessage.id);
                return prev;
              }
              
              return [...prev, {
                id: newMessage.id,
                role: newMessage.role,
                content: newMessage.content,
                timestamp: newMessage.created_at,
                metadata: { ...newMessage.metadata, source: 'realtime' }
              }];
            });
            setIsLoading(false);
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up real-time subscription');
        supabaseRef.current?.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, messages])
  
  /* ────────────── realtime session updates ────────────── */
  useEffect(() => {
    if (!supabaseRef.current || !sessionId) {
      return;
    }

    console.log('[ChatWidget] Setting up session metadata subscription for:', sessionId);

    const sessionChannel = supabaseRef.current
      .channel(`chat_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Real-time session update received:', payload);
          const updatedSession = payload.new as any;
          
          if (updatedSession.metadata) {
            const metadata = updatedSession.metadata;
            const hasActiveHandoff = metadata.handoff_requested === 'true' || metadata.handoff_requested === true;
            
            // If handoff flags are cleared in session metadata, restore handoff button
            if (!hasActiveHandoff && handoffRequested) {
              console.log('Session handoff cleared via metadata update, restoring handoff button');
              setHandoffRequested(false);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Session subscription status:', status);
      });

    return () => {
      console.log('Cleaning up session subscription');
      supabaseRef.current?.removeChannel(sessionChannel);
    };
  }, [sessionId, handoffRequested])


  /* ────────────── auto-scroll ────────────── */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [messages])

  /* ────────────── load chat history ────────────── */
  const loadChatHistory = useCallback(async () => {
    if (!supabaseRef.current || !sessionId) return

    try {
      // Load messages and session metadata in parallel
      const [messagesResult, sessionResult] = await Promise.all([
        supabaseRef.current
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true }),
        supabaseRef.current
          .from('chat_sessions')
          .select('metadata')
          .eq('session_id', sessionId)
          .single()
      ]);

      if (messagesResult.error) {
        console.error('Error loading chat history:', messagesResult.error)
        return
      }

      if (sessionResult.error) {
        // Check if it's a "not found" error (session doesn't exist yet)
        if (sessionResult.error.code === 'PGRST116' || sessionResult.error.message.includes('No rows')) {
          console.log('Session metadata not found - likely a new session');
          // For new sessions, default to no handoff requested
          setHandoffRequested(false);
        } else {
          console.error('Error loading session metadata:', sessionResult.error)
        }
        // Continue with message loading even if session metadata fails
      } else if (sessionResult.data?.metadata) {
        const metadata = sessionResult.data.metadata;
        // Check if handoff is active (not null, not undefined, and set to 'true' or true)
        const hasActiveHandoff = metadata.handoff_requested === 'true' || metadata.handoff_requested === true;
        
        // Check if there's a recent handback message that should clear the handoff
        let hasRecentHandback = false;
        if (messagesResult.data && messagesResult.data.length > 0) {
          // Look for handback messages from agents
          const handbackMessages = messagesResult.data.filter(msg => 
            msg.metadata?.handback_to_bot === true
          );
          if (handbackMessages.length > 0) {
            // Get the most recent handback message
            const latestHandback = handbackMessages[handbackMessages.length - 1];
            const handbackTime = new Date(latestHandback.created_at).getTime();
            
            // Get the handoff request time if available
            const handoffTime = metadata.handoff_requested_at 
              ? new Date(metadata.handoff_requested_at).getTime()
              : 0;
            
            // If handback is more recent than handoff request, clear the handoff
            hasRecentHandback = handbackTime > handoffTime;
          }
        }
        
        console.log('Session handoff status:', { 
          hasActiveHandoff, 
          hasRecentHandback, 
          handoffRequested: hasActiveHandoff && !hasRecentHandback 
        });
        
        setHandoffRequested(hasActiveHandoff && !hasRecentHandback);
      } else {
        // No session metadata or empty metadata - default to no handoff
        setHandoffRequested(false);
      }

      if (messagesResult.data && messagesResult.data.length > 0) {
        const formattedMessages: ChatMessage[] = messagesResult.data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.created_at || new Date().toISOString(),
          metadata: msg.metadata
        }))
        setMessages(formattedMessages)
        
        // Add message IDs to processed set
        messagesResult.data.forEach(msg => processedIdsRef.current.add(msg.id))
      } else {
        // Add welcome message if no history
        const welcomeId = `welcome_${Date.now()}`
        setMessages([{
          id: welcomeId,
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date().toISOString(),
          metadata: { isWelcome: true }
        }])
        processedIdsRef.current.add(welcomeId)
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
      setError('Failed to load chat history')
    }
  }, [sessionId, welcomeMessage])

  // Load chat history when session ID is available and widget is open
  useEffect(() => {
    if (sessionId && isOpen) {
      loadChatHistory()
    }
  }, [sessionId, isOpen, loadChatHistory])

  /* ────────────── open widget ────────────── */
  const handleOpen = useCallback(async () => {
    console.log('handleOpen called, current chatbotActive state:', chatbotActive);
    
    // Check chatbot status first
    const isActive = await checkChatbotStatus();
    console.log('checkChatbotStatus returned:', isActive);
    
    if (!isActive) {
      console.log('Chatbot is inactive, showing notification instead of opening chat');
      // Show inactive notification instead of opening chat
      setShowInactiveNotification(true);
      // Hide notification after 4 seconds
      setTimeout(() => {
        setShowInactiveNotification(false);
      }, 4000);
      return;
    }
    
    console.log('Chatbot is active, opening chat widget');
    setIsOpen(true)
    setIsMinimized(false)
    
    if (sessionId && userIdentifier) {
      await createChatSession()
      await loadChatHistory()
    }
    
    // Focus input after opening
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [sessionId, userIdentifier, createChatSession, loadChatHistory, checkChatbotStatus, chatbotActive])

  /* ────────────── send to n8n ────────────── */
  const sendToN8n = useCallback(async (message: string) => {
    if (!n8nWebhookUrl) throw new Error('N8N webhook URL not configured')

    const requestBody: N8nChatRequest = {
      message,
      sessionId,
      chatbotId,
      userIdentifier,
      knowledgeBaseIds,
      metadata: {
        platform,
        timestamp: new Date().toISOString()
      }
    }

    console.log('Sending to n8n:', requestBody)

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`N8N request failed: ${response.statusText}`)
    }

    const data: N8nChatResponse = await response.json()
    console.log('N8N Response:', data)
    
    // If there's a messageId in the response, add it to processed IDs
    if (data.messageId) {
      processedIdsRef.current.add(data.messageId)
    }
    
    return data
  }, [n8nWebhookUrl, sessionId, chatbotId, userIdentifier, platform, knowledgeBaseIds])

  /* ────────────── save message ────────────── */
  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string, metadata?: any) => {
    if (!supabaseRef.current || !sessionId) return

    try {
      const { data, error } = await supabaseRef.current
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          metadata: metadata || {}
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error saving message:', error)
      } else if (data?.id) {
        // Add the new message ID to the processed set
        processedIdsRef.current.add(data.id)
        return data.id
      }
    } catch (err) {
      console.error('Failed to save message:', err)
    }
  }, [sessionId])

  /* ────────────── handle send message ────────────── */
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading || !sessionId) return

    // Check chatbot status before sending message
    const isActive = await checkChatbotStatus();
    if (!isActive) {
      setError('This chatbot is currently inactive. Please try again later.');
      return;
    }

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)
    setError(null)

    // Generate a temporary ID for the user message
    const tempId = `user_${Date.now()}`
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }])

    try {
      // Save user message to database and get the real ID
      const messageId = await saveMessage('user', userMessage)
      
      // Send to n8n workflow
      const n8nResponse = await sendToN8n(userMessage)
      
      // If we get a response, add it immediately if not already added via realtime
      if (n8nResponse?.response) {
        console.log('Got immediate response from n8n:', n8nResponse.response)
        
        // Get the message ID if available from the response
        const assistantId = n8nResponse.messageId || `assistant_${Date.now()}`
        
        // Only add if not already processed (could have come in via realtime)
        if (!processedIdsRef.current.has(assistantId)) {
          processedIdsRef.current.add(assistantId)
          
          setMessages(prev => [...prev, {
            id: assistantId,
            role: 'assistant',
            content: n8nResponse.response,
            timestamp: new Date().toISOString(),
            metadata: { source: 'n8n_direct' }
          }])
        } else {
          console.log('Message already processed, not adding duplicate:', assistantId)
        }
        
        setIsLoading(false)
      } else {
        // If no immediate response, wait for real-time or timeout
        setTimeout(() => {
          setIsLoading(false)
          setError('Response timeout. Please try again.')
        }, 30000) // 30 second timeout
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
      setIsLoading(false)
      
      // Add error message to UI
      const errorId = `error_${Date.now()}`
      setMessages(prev => [...prev, {
        id: errorId,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      }])
    }
  }, [inputMessage, isLoading, sessionId, saveMessage, sendToN8n, checkChatbotStatus])

  /* ────────────── handle handoff request ────────────── */
  const handleRequestHandoff = useCallback(async (reason?: string) => {
    if (!supabaseRef.current || !sessionId || handoffRequested) return

    try {
      setIsLoading(true)
      
      // First, get the current session metadata to preserve existing fields
      const { data: currentSession, error: fetchError } = await supabaseRef.current
        .from('chat_sessions')
        .select('metadata')
        .eq('session_id', sessionId)
        .single()

      if (fetchError) {
        console.error('Error fetching current session:', fetchError)
        setError('Failed to request human support. Please try again.')
        return
      }

      // Merge handoff fields with existing metadata instead of replacing it
      const updatedMetadata = {
        ...currentSession.metadata, // Preserve existing metadata (widget_position, user_agent, created_at, etc.)
        handoff_requested: 'true',
        handoff_requested_at: new Date().toISOString(),
        handoff_reason: reason || 'User requested human support'
      }
      
      // Update session metadata to indicate handoff request
      const { error: sessionError } = await supabaseRef.current
        .from('chat_sessions')
        .update({
          metadata: updatedMetadata
        })
        .eq('session_id', sessionId)

      if (sessionError) {
        console.error('Error requesting handoff:', sessionError)
        setError('Failed to request human support. Please try again.')
        return
      }

      // Add a system message to the chat
      const handoffMessage: ChatMessage = {
        id: `handoff_${Date.now()}`,
        role: 'system',
        content: 'You have requested to speak with a human agent. Please wait while we connect you to the next available support representative.',
        timestamp: new Date().toISOString(),
        metadata: { isHandoffRequest: true }
      }

      setMessages(prev => [...prev, handoffMessage])
      setHandoffRequested(true)
      setShowHandoffDialog(false)
      setHandoffReason('')

      // Save the system message to database as assistant message with special metadata
      await saveMessage('assistant', handoffMessage.content, { ...handoffMessage.metadata, system_message: true })

      // Trigger n8n webhook for handoff notification (optional)
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

    } catch (err) {
      console.error('Error requesting handoff:', err)
      setError('Failed to request human support. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, handoffRequested, saveMessage, n8nWebhookUrl, chatbotId, userIdentifier])

  /* ────────────── handle key press ────────────── */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  /* ────────────── layout helpers ────────────── */
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }

  // Custom CSS variables for theming
  const themeStyles = {
    '--chat-primary-color': appearance.primaryColor || '#3b82f6',
    '--chat-font-family': appearance.fontFamily || 'system-ui, sans-serif',
    '--chat-border-radius': appearance.borderRadius || '12px'
  } as React.CSSProperties

  if (!sessionId || !userIdentifier) {
    return null // Don't render until session is initialized
  }

  return (
    <div 
      className={cn('fixed z-50', positionClasses[position])}
      style={themeStyles}
    >
      {/* Chat Window */}
      {isOpen && (
        <Card className={cn(
          'mb-4 w-96 bg-white/95 backdrop-blur-sm shadow-2xl border-0 flex flex-col overflow-hidden chat-widget-backdrop',
          'transition-all duration-300 ease-in-out transform',
          isMinimized ? 'h-16' : 'h-[32rem]'
        )}>
          {/* Header */}
          <CardHeader 
            className="flex flex-row items-center justify-between p-4 text-white relative overflow-hidden border-b-0"
            style={{ 
              background: `linear-gradient(135deg, var(--chat-primary-color) 0%, ${appearance.primaryColor || '#3b82f6'}dd 100%)`
            }}
          >
            <div className="flex items-center space-x-3 z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-white/80">Online • Ready to help</p>
              </div>
            </div>
            <div className="flex gap-1 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-white/20 p-2 h-8 w-8"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-2 h-8 w-8"
                title="Close"
              >
                <X size={14} />
              </Button>
            </div>
            {/* Background decoration */}
            <div className="absolute -top-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="flex-1 flex flex-col p-0 h-full min-h-0">
              {/* Messages */}
              <div className="flex-1 min-h-0 relative bg-gradient-to-b from-slate-50/50 to-white">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex animate-fadeIn',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className={cn(
                          'flex items-start space-x-3 max-w-[85%]',
                          message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                        )}>
                          {/* Avatar */}
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                            message.role === 'user' 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                              : 'bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300'
                          )}>
                            {message.role === 'user' ? (
                              <User size={14} className="text-white" />
                            ) : (
                              <Bot size={14} className="text-slate-600" />
                            )}
                          </div>
                          
                          {/* Message bubble */}
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-3 text-sm shadow-sm max-w-full relative message-bubble',
                              message.role === 'user'
                                ? 'text-white rounded-br-md'
                                : 'bg-white text-slate-800 rounded-bl-md border border-slate-200',
                              message.metadata?.error && 'bg-red-50 text-red-700 border-red-200'
                            )}
                            style={message.role === 'user' ? { 
                              background: `linear-gradient(135deg, var(--chat-primary-color) 0%, ${appearance.primaryColor || '#3b82f6'}dd 100%)`
                            } : {}}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            <p className={cn(
                              "text-xs mt-2 opacity-70",
                              message.role === 'user' ? 'text-white/80' : 'text-slate-500'
                            )}>
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start animate-fadeIn">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center mt-1">
                            <Bot size={14} className="text-slate-600" />
                          </div>
                          <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-200 typing-indicator">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-4 py-3 bg-red-50 border-t border-red-200 animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 bg-white border-t border-slate-100">
                {/* Handoff Request Notice */}
                {handoffRequested && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800">
                      <UserPlus size={16} />
                      <span className="text-sm font-medium">
                        Support request sent. A human agent will join soon.
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={isLoading || !sessionId}
                      className={cn(
                        "border-slate-200 rounded-2xl h-12",
                        "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200 placeholder-slate-400"
                      )}
                    />
                    {!sessionId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                        <span className="text-xs text-slate-500">Connecting...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Human Support Button */}
                  {!handoffRequested && (
                    <Button
                      onClick={() => setShowHandoffDialog(true)}
                      disabled={isLoading || !sessionId}
                      variant="outline"
                      className={cn(
                        "h-12 w-12 rounded-2xl border-2 border-slate-300",
                        "hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50",
                        "transition-all duration-200 disabled:hover:scale-100"
                      )}
                      title="Request human support"
                    >
                      <UserPlus size={18} />
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || !sessionId}
                    className={cn(
                      "h-12 w-12 rounded-2xl shadow-md",
                      "hover:shadow-lg hover:scale-105 active:scale-95",
                      "transition-all duration-200 disabled:hover:scale-100"
                    )}
                    style={{ 
                      background: `linear-gradient(135deg, var(--chat-primary-color) 0%, ${appearance.primaryColor || '#3b82f6'}dd 100%)`
                    }}
                    title="Send message"
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={handleOpen}
          disabled={chatbotActive === null}
          className={cn(
            "w-16 h-16 rounded-2xl shadow-2xl border-0 chat-button-pulse",
            "hover:scale-105 active:scale-95 transition-all duration-200",
            "relative overflow-hidden group",
            chatbotActive === null && "opacity-70 cursor-not-allowed",
            chatbotActive === false && "opacity-60"
          )}
          style={{ 
            background: `linear-gradient(135deg, var(--chat-primary-color) 0%, ${appearance.primaryColor || '#3b82f6'}dd 100%)`
          }}
          title={
            chatbotActive === null 
              ? "Loading..." 
              : chatbotActive === false 
                ? "Chatbot is currently inactive" 
                : "Open chat"
          }
        >
          <MessageCircle size={28} className="z-10 group-hover:rotate-12 transition-transform duration-200 text-white" />
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-0 group-hover:opacity-75"></div>
          {/* Background decoration */}
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-white/10 rounded-full"></div>
        </Button>
      )}

      {/* Inactive Chatbot Notification */}
      {showInactiveNotification && (
        <Card className={cn(
          "absolute mb-4 w-80 max-w-[90vw] animate-fadeIn shadow-2xl border border-amber-200 bg-amber-50",
          position?.includes('right') ? 'right-0' : 'left-0',
          position?.includes('bottom') ? 'bottom-20' : 'top-20'
        )}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-900 mb-1">
                  Chatbot Unavailable
                </h3>
                <p className="text-sm text-amber-800">
                  {inactiveMessage}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 hover:bg-amber-100 text-amber-600"
                onClick={() => setShowInactiveNotification(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Human Support Request Dialog */}
      <Dialog open={showHandoffDialog} onOpenChange={setShowHandoffDialog}>
        <DialogContent className="sm:max-w-md bg-amber-50">
          <DialogHeader>
            <DialogTitle>Request Human Support</DialogTitle>
            <DialogDescription>
              A human agent will join the conversation to assist you. Please briefly describe your issue (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Describe your issue (optional)..."
              value={handoffReason}
              onChange={(e) => setHandoffReason(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowHandoffDialog(false)
                  setHandoffReason('')
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleRequestHandoff(handoffReason.trim() || undefined)}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? 'Requesting...' : 'Request Support'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
