'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/context'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow, format } from 'date-fns'
import { ArrowLeft, Bot, User, Send, RefreshCw } from 'lucide-react'
import Link from 'next/link'
// Chat role guard is not needed here as we have inline access control
import { RealtimeChannel } from '@supabase/supabase-js'

// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager', 'Analyst/Reporter', 'Support Agent']
const INTERVENTION_ALLOWED = ['Super Admin', 'Chatbot Manager', 'Support Agent']

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

export default function ChatSessionDetailPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const { user, userRole, isLoading: authLoading, supabase } = useSupabase()
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentMessage, setAgentMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [isRealtime, setIsRealtime] = useState(true)
  const [realTimeConnection, setRealTimeConnection] = useState<RealtimeChannel | null>(null)

  // Check if user has access to this page
  const hasAccess = ALLOWED_ROLES.includes(userRole as string)
  const canIntervene = INTERVENTION_ALLOWED.includes(userRole as string)

  // Load chat session and messages
  useEffect(() => {
    if (authLoading || !supabase) return
    if (!user || !hasAccess) {
      setError('You do not have permission to access this page.')
      setLoading(false)
      return
    }
    
    if (!sessionId) return

    const fetchChatSession = async () => {
      try {
        setLoading(true)
        
        // Get session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select(`
            *,
            chatbots(name)
          `)
          .eq('session_id', sessionId)
          .single()
        
        if (sessionError) {
          throw new Error(`Error fetching session: ${sessionError.message}`)
        }
        
        if (!sessionData) {
          throw new Error('Session not found')
        }
        
        // Format session data
        const formattedSession = {
          ...sessionData,
          chatbot_name: sessionData.chatbots?.name || 'Unknown'
        }
        
        setSession(formattedSession)
        
        // Get messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
        
        if (messagesError) {
          throw new Error(`Error fetching messages: ${messagesError.message}`)
        }
        
        setMessages(messagesData || [])
        
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
      } catch (err: unknown) {
        console.error('Error fetching chat session:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chat session'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchChatSession()

    // Cleanup function for real-time subscription
    return () => {
      if (realTimeConnection) {
        realTimeConnection.unsubscribe()
      }
    }
  }, [sessionId, user, hasAccess, authLoading, isRealtime, supabase, realTimeConnection])

  // Handle sending agent message
  const handleSendAgentMessage = async () => {
    if (!sessionId || !agentMessage.trim() || !canIntervene || !supabase) return
    
    try {
      setSendingMessage(true)
      
      // Insert agent message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant', // Sent as assistant (bot), but with agent flag in metadata
          content: agentMessage,
          metadata: {
            agent_intervention: true,
            agent_id: user?.id,
            agent_email: user?.email
          }
        })
      
      if (messageError) {
        throw new Error(`Error sending message: ${messageError.message}`)
      }
      
      // Update session to mark human intervention
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
      
      if (updateError) {
        console.error('Error updating session:', updateError)
      }
      
      // Clear input
      setAgentMessage('')
      
    } catch (err: unknown) {
      console.error('Error sending agent message:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
    } finally {
      setSendingMessage(false)
    }
  }

  // Toggle real-time updates
  const toggleRealtime = () => {
    setIsRealtime(!isRealtime)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, h:mm a')
  }

  if (authLoading) {
    return <div className="p-4">Loading authentication...</div>
  }

  if (!hasAccess) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="mb-4">You do not have permission to access this page.</p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link href="/dashboard/chats">
            <ArrowLeft size={16} className="mr-2" /> Back to Chats
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Chat Session Details</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      {/* Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Session ID</div>
                  <div className="font-mono text-sm">{session.session_id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                  <Badge variant={
                    session.status === 'active' ? 'default' : 
                    session.status === 'completed' ? 'outline' : 'secondary'
                  }>
                    {session.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Chatbot</div>
                  <div>{session.chatbot_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Platform</div>
                  <div className="capitalize">{session.platform}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">User Identifier</div>
                  <div className="font-mono text-sm">{session.user_identifier}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                  <div>{formatTimestamp(session.created_at)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Last Activity</div>
                  <div>{formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Messages</div>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={toggleRealtime}
                disabled={loading}
              >
                <RefreshCw size={16} className={`mr-2 ${isRealtime ? 'animate-spin' : ''}`} />
                {isRealtime ? 'Disable' : 'Enable'} Real-time Updates
              </Button>
              
              {canIntervene && session?.status === 'active' && (
                <Button 
                  className="w-full justify-start" 
                  variant={session.metadata?.had_human_intervention ? 'secondary' : 'default'}
                  disabled={loading}
                >
                  <User size={16} className="mr-2" />
                  {session.metadata?.had_human_intervention 
                    ? 'Human Intervention Active' 
                    : 'Take Over Conversation'}
                </Button>
              )}

              {userRole === 'Super Admin' && (
                <Button 
                  className="w-full justify-start" 
                  variant="outline" 
                  disabled={loading}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Reload Session Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Messages */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Chat Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className={`h-20 w-2/3 ${i % 2 === 0 ? 'rounded-br-none' : 'rounded-bl-none'}`} />
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
                {messages.map((message) => {
                  const isUser = message.role === 'user'
                  const isAgent = message.role === 'assistant' && message.metadata?.agent_intervention
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-3 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isUser 
                            ? 'bg-blue-500 text-white' 
                            : isAgent 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-slate-100 border border-slate-200'
                        }`}>
                          {isUser ? (
                            <User size={14} />
                          ) : (
                            <Bot size={14} />
                          )}
                        </div>
                        
                        <div className={`rounded-lg p-3 ${
                          isUser 
                            ? 'bg-blue-500 text-white rounded-tr-none' 
                            : isAgent 
                              ? 'bg-purple-500 text-white rounded-tl-none' 
                              : 'bg-slate-100 rounded-tl-none'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          
                          <div className={`text-xs mt-1 ${
                            isUser || isAgent ? 'text-white/70' : 'text-slate-500'
                          }`}>
                            {formatTimestamp(message.created_at)}
                            {isAgent && (
                              <span className="ml-1 font-medium">
                                • Agent: {message.metadata?.agent_email?.split('@')[0] || 'Unknown'}
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

        {/* Agent Response Input */}
        {canIntervene && session?.status === 'active' && (
          <CardFooter className="border-t pt-4">
            <div className="flex w-full gap-2">
              <Textarea
                value={agentMessage}
                onChange={(e) => setAgentMessage(e.target.value)}
                placeholder="Type your response as an agent..."
                className="flex-1"
                disabled={sendingMessage}
              />
              <Button 
                onClick={handleSendAgentMessage} 
                disabled={!agentMessage.trim() || sendingMessage}
              >
                <Send size={16} className="mr-2" />
                Send
              </Button>
            </div>
            <div className="w-full text-xs text-muted-foreground mt-2">
              Your message will be sent as an agent intervention in this conversation.
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
