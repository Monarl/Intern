'use client'

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import {
  MessageCircle,
  Send,
  X,
  Minus,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createSupabaseClient } from '@/lib/supabase'
import {
  generateSessionId,
  generateUserIdentifier,
  formatTime,
  cn,
} from '@/lib/utils'
import type { ChatMessage, ChatWidgetConfig, N8nChatRequest, N8nChatResponse } from '@/types/chat'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * 💡 This component is a refactored & restyled version of the original ChatWidget.
 * - Split into small, readable sections (< 300 LOC)
 * - Rely on shadcn/ui components for consistent styling
 * - Keeps business logic untouched; mostly UI polish
 */
export function ChatWidget({
  chatbotId,
  supabaseUrl,
  supabaseAnonKey,
  n8nWebhookUrl,
  appearance = {},
  position = 'bottom-right',
  welcomeMessage = 'Hello! How can I help you today?',
}: ChatWidgetConfig) {
  /* ------------------------------ State & refs ------------------------------ */
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [sessionDbId, setSessionDbId] = useState('')
  const [userIdentifier, setUserIdentifier] = useState('')
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  /* --------------------------- Supabase bootstrap -------------------------- */
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      supabaseRef.current = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    }
  }, [supabaseUrl, supabaseAnonKey])

  useEffect(() => {
    if (!sessionId) {
      setSessionId(generateSessionId())
      setUserIdentifier(generateUserIdentifier())
    }
  }, [sessionId])

  // Helpers
  const createChatSession = useCallback(async () => {
    if (!supabaseRef.current || !sessionId || !userIdentifier) return
    const { data, error } = await supabaseRef.current
      .from('chat_sessions')
      .insert({
        session_id: sessionId,
        chatbot_id: chatbotId,
        user_identifier: userIdentifier,
        platform: 'web',
        status: 'active',
      })
      .select('id')
      .single()
    if (!error && data) setSessionDbId(data.id)
  }, [sessionId, userIdentifier, chatbotId])

  /* ------------------------ Realtime subscription ------------------------- */
  useEffect(() => {
    if (!supabaseRef.current || !sessionDbId) return

    const ch = supabaseRef.current
      .channel(`chat_messages_${sessionDbId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionDbId}` },
        (payload) => {
          const m = payload.new as any
          if (m.role === 'assistant') setMessages((prev) => [...prev, { id: m.id, role: 'assistant', content: m.content, timestamp: m.created_at }])
          setLoading(false)
        },
      )
      .subscribe()
    channelRef.current = ch
    return () => {
      supabaseRef.current?.removeChannel(ch)
    }
  }, [sessionDbId])

  /* ------------------------ Chat history bootstrap ------------------------ */
  const loadHistory = useCallback(async () => {
    if (!supabaseRef.current || !sessionDbId) return
    const { data } = await supabaseRef.current
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionDbId)
      .order('created_at', { ascending: true })
    if (data?.length) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        })),
      )
    } else {
      setMessages([
        { id: 'welcome', role: 'assistant', content: welcomeMessage, timestamp: new Date().toISOString() },
      ])
    }
  }, [sessionDbId, welcomeMessage])

  /* --------------------------- Send helper funcs --------------------------- */
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!supabaseRef.current || !sessionDbId) return
    await supabaseRef.current.from('chat_messages').insert({ session_id: sessionDbId, role, content })
  }

  const sendToN8n = async (message: string) => {
    const body: N8nChatRequest = {
      message,
      sessionId,
      chatbotId,
      userIdentifier,
      metadata: { platform: 'web' },
    }
    const res = await fetch(n8nWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw new Error('n8n error')
    const data: N8nChatResponse = await res.json()
    return data
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !sessionDbId) return
    const msg = input.trim()
    setInput('')
    setLoading(true)
    const localMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, localMsg])
    await saveMessage('user', msg)
    try {
      await sendToN8n(msg)
    } catch {
      setLoading(false)
    }
  }

  /* ------------------------------- Lifecycles ------------------------------ */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* -------------------------------- Styles -------------------------------- */
  const pos = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }[position]
  const cssVars = {
    '--chat-primary': appearance.primaryColor || '#3b82f6',
    '--chat-radius': appearance.borderRadius || '1rem',
  } as React.CSSProperties

  /* --------------------------------- Render -------------------------------- */
  if (!sessionId || !userIdentifier) return null

  return (
    <div className={cn('fixed z-50', pos)} style={cssVars}>
      {/* Floating toggle button */}
      {!open && (
        <Button
          className="w-14 h-14 rounded-full shadow-xl p-0 bg-[--chat-primary] hover:scale-105 transition"
          onClick={async () => {
            setOpen(true)
            if (!sessionDbId) await createChatSession()
            await loadHistory()
          }}
        >
          <MessageCircle size={24} />
        </Button>
      )}

      {/* Chat window */}
      {open && (
        <Card
          className={cn(
            'flex flex-col w-80 sm:w-96 max-h-[32rem] transition-all',
            minimized ? 'h-16 overflow-hidden' : 'h-[32rem]',
          )}
          style={{ borderRadius: 'var(--chat-radius)' }}
        >
          <CardHeader className="flex items-center justify-between px-4 py-2 bg-[--chat-primary] text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="font-semibold text-sm">Chat Support</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="text-white/80 hover:bg-white/10" onClick={() => setMinimized((p) => !p)}>
                {minimized ? <Minus size={16} /> : <Minus size={16} />}
              </Button>
              <Button size="icon" variant="ghost" className="text-white/80 hover:bg-white/10" onClick={() => setOpen(false)}>
                <X size={16} />
              </Button>
            </div>
          </CardHeader>

          {!minimized && (
            <>
              <CardContent className="flex-1 p-0 bg-muted/40">
                <ScrollArea className="h-full px-4 py-3 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'rounded-xl px-4 py-2 text-sm shadow',
                          m.role === 'user'
                            ? 'bg-[--chat-primary] text-white rounded-br-none'
                            : 'bg-white text-foreground rounded-bl-none border',
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <p className="text-[10px] mt-1 opacity-60">{formatTime(m.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[--chat-primary] rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-[--chat-primary] rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-[--chat-primary] rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  )}
                  <div ref={bottomRef} />
                </ScrollArea>
              </CardContent>

              <div className="border-t p-3 flex gap-2 bg-background">
                <Input
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={!sessionDbId || loading}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim() || loading} className="bg-[--chat-primary] hover:opacity-90">
                  <Send size={16} />
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
