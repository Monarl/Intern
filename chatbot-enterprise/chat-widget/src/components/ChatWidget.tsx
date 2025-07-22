'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Minimize2, Bot, User } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { generateSessionId, generateUserIdentifier, formatTime, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ChatMessage, ChatSession, ChatWidgetConfig, N8nChatRequest, N8nChatResponse } from '@/types/chat'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function ChatWidget({
  chatbotId,
  supabaseUrl,
  supabaseAnonKey,
  n8nWebhookUrl,
  platform = 'web',
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
      const { data, error } = await supabaseRef.current
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading chat history:', error)
        return
      }

      if (data && data.length > 0) {
        const formattedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.created_at || new Date().toISOString(),
          metadata: msg.metadata
        }))
        setMessages(formattedMessages)
        
        // Add message IDs to processed set
        data.forEach(msg => processedIdsRef.current.add(msg.id))
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
  }, [sessionId, userIdentifier, createChatSession, loadChatHistory])

  /* ────────────── send to n8n ────────────── */
  const sendToN8n = useCallback(async (message: string) => {
    if (!n8nWebhookUrl) throw new Error('N8N webhook URL not configured')

    const requestBody: N8nChatRequest = {
      message,
      sessionId,
      chatbotId,
      userIdentifier,
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
  }, [n8nWebhookUrl, sessionId, chatbotId, userIdentifier, platform])

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
  }, [inputMessage, isLoading, sessionId, saveMessage, sendToN8n])

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
          className={cn(
            "w-16 h-16 rounded-2xl shadow-2xl border-0 chat-button-pulse",
            "hover:scale-105 active:scale-95 transition-all duration-200",
            "relative overflow-hidden group"
          )}
          style={{ 
            background: `linear-gradient(135deg, var(--chat-primary-color) 0%, ${appearance.primaryColor || '#3b82f6'}dd 100%)`
          }}
          title="Open chat"
        >
          <MessageCircle size={28} className="z-10 group-hover:rotate-12 transition-transform duration-200 text-white" />
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-0 group-hover:opacity-75"></div>
          {/* Background decoration */}
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-white/10 rounded-full"></div>
        </Button>
      )}
    </div>
  )
}
