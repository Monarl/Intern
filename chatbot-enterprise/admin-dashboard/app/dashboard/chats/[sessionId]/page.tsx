'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { useParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/context'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ArrowLeft,
  Bot,
  User,
  Send,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ────── Access control ──────────────────────────────────────────────────────
const ALLOWED_ROLES = [
  'Super Admin',
  'Chatbot Manager',
  'Analyst/Reporter',
  'Support Agent',
]
const INTERVENTION_ALLOWED = [
  'Super Admin',
  'Chatbot Manager',
  'Support Agent',
]

// ────── Types ───────────────────────────────────────────────────────────────
interface MessageMetadata {
  agent_intervention?: boolean
  agent_id?: string
  agent_email?: string
  source?: string
  [key: string]: unknown
}

interface SessionMetadata {
  had_human_intervention?: boolean
  last_agent_id?: string
  widget_position?: string
  user_agent?: string
  handoff_requested?: string | null
  handoff_requested_at?: string | null
  handoff_reason?: string | null
  [key: string]: unknown
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: MessageMetadata
}

type ChatSession = {
  session_id: string
  chatbot_id: string
  chatbot_name?: string
  user_identifier: string
  platform: string
  status: string
  metadata: SessionMetadata
  created_at: string
  updated_at: string
  message_count?: number
  chatbots?: {
    name: string
  }
}

// ────── Component ───────────────────────────────────────────────────────────
export default function ChatSessionDetailPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const {
    user,
    userRole,
    isLoading: authLoading,
    supabase,
  } = useSupabase()

  // ── UI state ────────────────────────────────────────────────────────────
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentMessage, setAgentMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const [isRealtime, setIsRealtime] = useState(true)
  const [isVisible, setIsVisible] = useState(true)

  // ── Access checks ───────────────────────────────────────────────────────
  const hasAccess = ALLOWED_ROLES.includes(userRole as string)
  const canIntervene = INTERVENTION_ALLOWED.includes(userRole as string)

  // ── Visibility change – pause polling when tab hidden ───────────────────
  useEffect(() => {
    const handler = () =>
      setIsVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handler)
    return () =>
      document.removeEventListener('visibilitychange', handler)
  }, [])

  // ── Data fetch helper (re-usable for manual reload) ──────────────────────
  const fetchChatSession = useCallback(
    async (showLoader = true) => {
      if (!supabase || !sessionId) return
      try {
        if (showLoader) setLoading(true)

        // ─ session
        const { data: sessionData, error: sErr } = await supabase
          .from('chat_sessions')
          .select(
            `
            *,
            chatbots(name)
          `,
          )
          .eq('session_id', sessionId)
          .single()

        if (sErr) throw new Error(sErr.message)
        if (!sessionData) throw new Error('Session not found')

        setSession({
          ...sessionData,
          chatbot_name: sessionData.chatbots?.name || 'Unknown',
        })

        // ─ messages
        const { data: mData, error: mErr } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })

        if (mErr) throw new Error(mErr.message)
        setMessages(mData || [])
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : 'Failed to load chat session'
        setError(msg)
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [supabase, sessionId],
  )

  // ── Initial + dependency-triggered load ─────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user || !hasAccess) {
      setError('You do not have permission to access this page.')
      setLoading(false)
      return
    }
    if (!sessionId || !isVisible) return
    fetchChatSession()
  }, [
    sessionId,
    user,
    hasAccess,
    authLoading,
    isVisible,
    fetchChatSession,
  ])

  // ── Real-time subscription handling ─────────────────────────────────────
  const channelRef = useRef<RealtimeChannel | null>(null) // holds current channel
  const realtimeRef = useRef<boolean>(true) // keeps latest flag for callback

  useEffect(() => {
    realtimeRef.current = isRealtime // keep mirror in sync

    // Close any open channel if real-time disabled, or preconditions fail
    if (
      !isRealtime ||
      !supabase ||
      !sessionId ||
      !session ||
      session.status !== 'active'
    ) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    // Already subscribed → nothing to do
    if (channelRef.current) return

    const channel = supabase
      .channel(`chat_${sessionId}`) // stable ID for both messages and session updates
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: ChatMessage }) => {
          // Ignore if user toggled real-time off after subscription
          if (!realtimeRef.current) return
          const newMsg = payload.new
          setMessages((prev) =>
            prev.find((m) => m.id === newMsg.id)
              ? prev
              : [...prev, newMsg],
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: { session_id: string; metadata: Record<string, unknown>; updated_at: string } }) => {
          // Ignore if user toggled real-time off after subscription
          if (!realtimeRef.current) return
          
          const updatedSession = payload.new
          console.log('Real-time session update received:', updatedSession)
          
          // Update session state with new metadata
          setSession(prevSession => {
            if (!prevSession) return prevSession
            return {
              ...prevSession,
              metadata: updatedSession.metadata,
              updated_at: updatedSession.updated_at,
            }
          })
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [supabase, sessionId, isRealtime, session])

  // ── Send agent message ──────────────────────────────────────────────────
  const handleSendAgentMessage = async () => {
    if (
      !sessionId ||
      !agentMessage.trim() ||
      !canIntervene ||
      !supabase
    )
      return

    try {
      setSendingMessage(true)

      // Insert message
      const messageData = {
        session_id: sessionId,
        role: 'assistant' as const,
        content: agentMessage,
        metadata: {
          agent_intervention: true,
          agent_id: user?.id,
          agent_email: user?.email,
        },
      }

      const { data: newMessage, error: mErr } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single()

      if (mErr) throw new Error(mErr.message)

      // Immediately add the message to the UI state (optimistic update)
      if (newMessage) {
        setMessages(prev => [...prev, {
          id: newMessage.id,
          role: newMessage.role,
          content: newMessage.content,
          created_at: newMessage.created_at,
          metadata: newMessage.metadata
        }])
      }

      // Mark intervention
      const updatedSessionMetadata = {
        ...session?.metadata,
        had_human_intervention: true,
        last_agent_id: user?.id,
      }

      const { error: uErr } = await supabase
        .from('chat_sessions')
        .update({
          updated_at: new Date().toISOString(),
          metadata: updatedSessionMetadata,
        })
        .eq('session_id', sessionId)
      if (uErr) console.error('Error updating session:', uErr)

      // Update session state immediately
      if (session) {
        setSession({
          ...session,
          metadata: updatedSessionMetadata,
          updated_at: new Date().toISOString()
        })
      }

      setAgentMessage('')

    //   // If real-time is off, fetch latest manually
    //   if (!isRealtime) await fetchChatSession(false)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Failed to send message'
      setError(msg)
    } finally {
      setSendingMessage(false)
    }
  }

  // ── Hand back to bot ────────────────────────────────────────────────────
  const handleHandBackToBot = async () => {
    if (!sessionId || !canIntervene || !supabase) return

    try {
      setSendingMessage(true)

      // Send a message indicating handback to bot
      const handbackMessageData = {
        session_id: sessionId,
        role: 'assistant' as const,
        content: 'I have completed assisting you. The chatbot will now continue to help you with any further questions.',
        metadata: {
          agent_intervention: true,
          agent_id: user?.id,
          agent_email: user?.email,
          handback_to_bot: true,
        }
      }

      const { data: handbackMessage, error: mErr } = await supabase
        .from('chat_messages')
        .insert(handbackMessageData)
        .select()
        .single()

      if (mErr) throw new Error(mErr.message)

      // Immediately add the handback message to the UI state
      if (handbackMessage) {
        setMessages(prev => [...prev, {
          id: handbackMessage.id,
          role: handbackMessage.role,
          content: handbackMessage.content,
          created_at: handbackMessage.created_at,
          metadata: handbackMessage.metadata
        }])
      }

      // Clear handoff request flags - use null instead of undefined to preserve JSON structure
      const updatedMetadata = { ...session?.metadata }
      updatedMetadata.had_human_intervention = true
      updatedMetadata.last_agent_id = user?.id
      // Set handoff flags to null instead of undefined to ensure proper JSON handling
      updatedMetadata.handoff_requested = null
      updatedMetadata.handoff_requested_at = null  
      updatedMetadata.handoff_reason = null

      const { error: uErr } = await supabase
        .from('chat_sessions')
        .update({
          updated_at: new Date().toISOString(),
          metadata: updatedMetadata,
        })
        .eq('session_id', sessionId)
      if (uErr) console.error('Error updating session:', uErr)

      // Immediately update the session state to reflect the handback
      if (session) {
        setSession({
          ...session,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
      }

      // Trigger n8n webhook to notify of handback (optional)
      // Note: This would need to be retrieved from the chatbot config in a real implementation
      const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      if (n8nWebhookUrl) {
        try {
          await fetch(n8nWebhookUrl.replace('/rag-chat', '/handback-to-bot'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              chatbotId: session?.chatbot_id,
              agentId: user?.id,
              timestamp: new Date().toISOString()
            })
          })
        } catch (webhookError) {
          console.warn('Failed to notify n8n of handback:', webhookError)
        }
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to hand back to bot'
      setError(msg)
    } finally {
      setSendingMessage(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const toggleRealtime = () =>
    setIsRealtime((v) => !v)

  const formatTimestamp = (ts: string) =>
    format(new Date(ts), 'MMM d, h:mm a')

  // ── Render guards ───────────────────────────────────────────────────────
  if (authLoading)
    return <div className="p-4">Loading authentication...</div>

  if (!hasAccess)
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">
          Access Restricted
        </h2>
        <p className="mb-4">
          You do not have permission to access this page.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    )

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="mr-4"
        >
          <Link href="/dashboard/chats">
            <ArrowLeft size={16} className="mr-2" /> Back to
            Chats
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          Chat Session Details
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      {/* Session info + actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* ─ Session information ─ */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : session ? (
              <div className="grid grid-cols-2 gap-4">
                {/* ID */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Session ID
                  </div>
                  <div className="font-mono text-sm">
                    {session.session_id}
                  </div>
                </div>
                {/* Status */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge
                    variant={
                      session.status === 'active'
                        ? 'default'
                        : session.status === 'completed'
                        ? 'outline'
                        : 'secondary'
                    }
                  >
                    {session.status}
                  </Badge>
                </div>
                {/* Chatbot */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Chatbot
                  </div>
                  <div>{session.chatbot_name}</div>
                </div>
                {/* Platform */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Platform
                  </div>
                  <div className="capitalize">
                    {session.platform}
                  </div>
                </div>
                {/* User */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User Identifier
                  </div>
                  <div className="font-mono text-sm">
                    {session.user_identifier}
                  </div>
                </div>
                {/* Created */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created
                  </div>
                  <div>
                    {formatTimestamp(session.created_at)}
                  </div>
                </div>
                {/* Updated */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Last Activity
                  </div>
                  <div>
                    {formatDistanceToNow(
                      new Date(session.updated_at),
                      { addSuffix: true },
                    )}
                  </div>
                </div>
                {/* Messages */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Messages
                  </div>
                  <div>{messages.length}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Session not found
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─ Actions ─ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Toggle real-time */}
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={toggleRealtime}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={`mr-2 ${
                    isRealtime ? 'animate-spin' : ''
                  }`}
                />
                {isRealtime ? 'Disable' : 'Enable'} Real-time
                Updates
              </Button>

              {/* Take over */}
              {canIntervene && session?.status === 'active' && (
                <Button
                  className="w-full justify-start"
                  variant={
                    session.metadata?.had_human_intervention
                      ? 'secondary'
                      : 'default'
                  }
                  disabled={loading}
                >
                  <User size={16} className="mr-2" />
                  {session.metadata?.had_human_intervention
                    ? 'Human Intervention Active'
                    : 'Take Over Conversation'}
                </Button>
              )}

              {/* Manual reload */}
              {userRole === 'Super Admin' && (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={loading}
                  onClick={() => fetchChatSession()}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Reload Session Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─ Chat messages ─ */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Chat Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`flex ${
                    i % 2 === 0
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <Skeleton
                    className={`h-20 w-2/3 ${
                      i % 2 === 0
                        ? 'rounded-br-none'
                        : 'rounded-bl-none'
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages in this conversation yet.
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4 mb-4">
                {messages.map((m) => {
                  const isUser = m.role === 'user'
                  const isAgent =
                    m.role === 'assistant' &&
                    m.metadata?.agent_intervention
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isUser
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex items-start gap-3 max-w-[75%] ${
                          isUser
                            ? 'flex-row-reverse'
                            : 'flex-row'
                        }`}
                      >
                        {/* avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isUser
                              ? 'bg-blue-500 text-white'
                              : isAgent
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {isUser ? (
                            <User size={14} />
                          ) : (
                            <Bot size={14} />
                          )}
                        </div>

                        {/* bubble */}
                        <div
                          className={`rounded-lg p-3 ${
                            isUser
                              ? 'bg-blue-500 text-white rounded-tr-none'
                              : isAgent
                              ? 'bg-purple-500 text-white rounded-tl-none'
                              : 'bg-slate-100 rounded-tl-none'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">
                            {m.content}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              isUser || isAgent
                                ? 'text-white/70'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatTimestamp(m.created_at)}
                            {isAgent && (
                              <span className="ml-1 font-medium">
                                • Agent:{' '}
                                {m.metadata?.agent_email?.split(
                                  '@',
                                )[0] || 'Unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>

        {/* Agent input */}
        {canIntervene && session?.status === 'active' && (
          <CardFooter className="border-t pt-4">
            <div className="flex w-full gap-2">
              <Textarea
                value={agentMessage}
                onChange={(e) =>
                  setAgentMessage(e.target.value)
                }
                placeholder="Type your response as an agent..."
                className="flex-1"
                disabled={sendingMessage}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendAgentMessage}
                  disabled={
                    !agentMessage.trim() || sendingMessage
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send size={16} className="mr-2" />
                  Send
                </Button>
                {session?.metadata?.handoff_requested === 'true' && (
                  <Button
                    onClick={handleHandBackToBot}
                    disabled={sendingMessage}
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Bot size={16} className="mr-2" />
                    Hand Back to Bot
                  </Button>
                )}
              </div>
            </div>
            <div className="w-full text-xs text-muted-foreground mt-2">
              {session?.metadata?.handoff_requested === 'true' ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>
                    User requested human support
                    {typeof session.metadata.handoff_reason === 'string' && 
                      session.metadata.handoff_reason && 
                      `: ${session.metadata.handoff_reason}`
                    }
                  </span>
                </div>
              ) : (
                'Your message will be sent as an agent intervention in this conversation.'
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
