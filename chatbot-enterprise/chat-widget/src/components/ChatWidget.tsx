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
  appearance = {},
  position = 'bottom-right',
  welcomeMessage = 'Hello! How can I help you today?'
}: ChatWidgetConfig) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [sessionDbId, setSessionDbId] = useState<string>('')
  const [userIdentifier, setUserIdentifier] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Initialize Supabase client
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      supabaseRef.current = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    }
  }, [supabaseUrl, supabaseAnonKey])

  // Initialize session
  useEffect(() => {
    if (!sessionId) {
      const newSessionId = generateSessionId()
      const newUserIdentifier = generateUserIdentifier()
      setSessionId(newSessionId)
      setUserIdentifier(newUserIdentifier)
    }
  }, [sessionId])

  // Create chat session in database
  const createChatSession = useCallback(async () => {
    if (!supabaseRef.current || !sessionId || !userIdentifier) return

    try {
      const { data, error } = await supabaseRef.current
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          chatbot_id: chatbotId,
          user_identifier: userIdentifier,
          platform: 'web',
          status: 'active',
          metadata: {
            widget_position: position,
            user_agent: navigator.userAgent
          }
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating chat session:', error)
      } else if (data) {
        setSessionDbId(data.id)
      }
    } catch (err) {
      console.error('Failed to create chat session:', err)
    }
  }, [sessionId, userIdentifier, chatbotId, position])

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!supabaseRef.current || !sessionDbId) return

    const channel = supabaseRef.current
      .channel(`chat_messages_${sessionDbId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionDbId}`,
        },
        (payload) => {
          const newMessage = payload.new as any
          if (newMessage.role === 'assistant') {
            setMessages(prev => [...prev, {
              id: newMessage.id,
              role: newMessage.role,
              content: newMessage.content,
              timestamp: newMessage.created_at,
              metadata: newMessage.metadata
            }])
            setIsLoading(false)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabaseRef.current?.removeChannel(channelRef.current)
      }
    }
  }, [sessionDbId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!supabaseRef.current || !sessionDbId) return

    try {
      const { data, error } = await supabaseRef.current
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionDbId)
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
      } else {
        // Add welcome message if no history
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date().toISOString(),
          metadata: { isWelcome: true }
        }])
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
      setError('Failed to load chat history')
    }
  }, [sessionDbId, welcomeMessage])

  // Load chat history when session DB ID is available
  useEffect(() => {
    if (sessionDbId && isOpen) {
      loadChatHistory()
    }
  }, [sessionDbId, isOpen, loadChatHistory])

  // Handle opening chat
  const handleOpen = useCallback(async () => {
    setIsOpen(true)
    setIsMinimized(false)
    
    if (sessionId && userIdentifier && !sessionDbId) {
      await createChatSession()
    }
    
    if (sessionDbId) {
      await loadChatHistory()
    }
    
    // Focus input after opening
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [sessionId, userIdentifier, sessionDbId, createChatSession, loadChatHistory])

  // Send message to n8n workflow
  const sendToN8n = useCallback(async (message: string) => {
    if (!n8nWebhookUrl) throw new Error('N8N webhook URL not configured')

    const requestBody: N8nChatRequest = {
      message,
      sessionId,
      chatbotId,
      userIdentifier,
      metadata: {
        platform: 'web',
        timestamp: new Date().toISOString()
      }
    }

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
    return data
  }, [n8nWebhookUrl, sessionId, chatbotId, userIdentifier])

  // Save message to database
  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string, metadata?: any) => {
    if (!supabaseRef.current || !sessionDbId) return

    try {
      const { error } = await supabaseRef.current
        .from('chat_messages')
        .insert({
          session_id: sessionDbId,
          role,
          content,
          metadata: metadata || {}
        })

      if (error) {
        console.error('Error saving message:', error)
      }
    } catch (err) {
      console.error('Failed to save message:', err)
    }
  }, [sessionDbId])

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading || !sessionDbId) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)
    setError(null)

    // Add user message to UI immediately
    const userMsgObj: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsgObj])

    try {
      // Save user message to database
      await saveMessage('user', userMessage)

      // Send to n8n workflow - the response will come via real-time subscription
      await sendToN8n(userMessage)

    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
      setIsLoading(false)
      
      // Add error message to UI
      const errorMsgObj: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      }
      setMessages(prev => [...prev, errorMsgObj])
    }
  }, [inputMessage, isLoading, sessionDbId, saveMessage, sendToN8n])

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // Position classes
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
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-slate-50/50 to-white">
                <div className="space-y-4">
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
                      disabled={isLoading || !sessionDbId}
                      className={cn(
                        "border-slate-200 rounded-2xl h-12",
                        "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200 placeholder-slate-400"
                      )}
                    />
                    {!sessionDbId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                        <span className="text-xs text-slate-500">Connecting...</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || !sessionDbId}
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
