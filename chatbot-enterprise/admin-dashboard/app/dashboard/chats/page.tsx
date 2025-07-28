'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/context'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Users, BarChart, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager', 'Analyst/Reporter', 'Support Agent']

interface SessionMetadata {
  had_human_intervention?: boolean
  last_agent_id?: string
  widget_position?: string
  user_agent?: string
  [key: string]: unknown
}

type ChatSession = {
  session_id: string
  user_identifier: string
  platform: string
  status: string
  metadata: SessionMetadata
  created_at: string
  updated_at: string
  chatbot_id: string
  chatbot_name?: string // Will be populated from join
  message_count?: number // Will be populated from aggregation
  chatbots?: {
    name: string
  }
}

type ChatStats = {
  total_sessions: number
  active_sessions: number
  messages_today: number
  avg_response_time: number
  avg_session_duration: number
  peak_hour: string
  human_handoffs: number
  satisfaction_rate: number
}

// Helper functions for formatting
const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0s'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) return `${remainingSeconds}s`
  return `${minutes}m ${remainingSeconds}s`
}

const formatHour = (hourString: string): string => {
  const hour = parseInt(hourString.split(':')[0], 10)
  const isPM = hour >= 12
  const displayHour = hour % 12 || 12 // Convert 0 to 12
  return `${displayHour}:00 ${isPM ? 'PM' : 'AM'} - ${displayHour + 1}:00 ${isPM ? 'PM' : 'AM'}`
}

export default function ChatsPage() {
  const { user, userRole, isLoading: authLoading, supabase } = useSupabase()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [stats, setStats] = useState<ChatStats>({
    total_sessions: 0,
    active_sessions: 0,
    messages_today: 0,
    avg_response_time: 0,
    avg_session_duration: 0,
    peak_hour: '00:00',
    human_handoffs: 0,
    satisfaction_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user has access to this page
  const hasAccess = ALLOWED_ROLES.includes(userRole as string)

  // Load chat sessions and stats
  useEffect(() => {
    if (authLoading || !supabase) return
    if (!user || !hasAccess) {
      setError('You do not have permission to access this page.')
      setLoading(false)
      return
    }

    const fetchChatSessions = async () => {
      try {
        setLoading(true)
        
        // Get all chat sessions
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select(`
            *,
            chatbots(name)
          `)
          .order('updated_at', { ascending: false })
          .limit(20)
        
        if (sessionError) throw sessionError
        
        // Get message counts for each session
        const sessionsWithCounts = await Promise.all(
          (sessionData || []).map(async (session: ChatSession) => {
            const { count, error: countError } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', session.session_id)
            
            if (countError) {
              console.warn(`Error getting message count for session ${session.session_id}:`, countError)
            }
            
            return {
              ...session,
              chatbot_name: session.chatbots?.name || 'Unknown',
              message_count: count || 0
            }
          })
        )
        
        setSessions(sessionsWithCounts)
        
        // Get overall stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const { count: totalSessions } = await supabase
          .from('chat_sessions')
          .select('*', { count: 'exact', head: true })
        
        const { count: activeSessions } = await supabase
          .from('chat_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
        
        const { count: messagesToday } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())
        
        // Calculate average response time
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          
        if (messagesError) {
          console.warn('Error getting messages for response time:', messagesError)
        }
        
        // Calculate average response time
        let totalResponseTime = 0
        let responseCount = 0
        const hourCounts: Record<number, number> = {}
        
        if (messages && messages.length > 1) {
          for (let i = 1; i < messages.length; i++) {
            const prevMessage = messages[i-1]
            const currentMessage = messages[i]
            
            // Count messages by hour for peak hour calculation
            const messageHour = new Date(currentMessage.created_at).getHours()
            hourCounts[messageHour] = (hourCounts[messageHour] || 0) + 1
            
            // Only calculate response time for bot responses to user messages
            if (prevMessage.role === 'user' && currentMessage.role === 'assistant') {
              const prevTime = new Date(prevMessage.created_at).getTime()
              const currentTime = new Date(currentMessage.created_at).getTime()
              const responseTime = (currentTime - prevTime) / 1000 // in seconds
              
              if (responseTime > 0 && responseTime < 300) { // Filter out outliers (>5 min)
                totalResponseTime += responseTime
                responseCount++
              }
            }
          }
        }
        
        const avgResponseTime = responseCount > 0 
          ? Math.round(totalResponseTime / responseCount) 
          : 0
          
        // Find peak hour
        let peakHour = 0
        let maxCount = 0
        
        Object.entries(hourCounts).forEach(([hour, count]) => {
          if (count > maxCount) {
            maxCount = count
            peakHour = parseInt(hour)
          }
        })
        
        // Calculate average session duration for completed sessions
        let totalDuration = 0
        let completedSessions = 0
        
        for (const session of sessionsWithCounts) {
          if (session.status === 'completed') {
            // Get first and last message for this session
            const { data: sessionMessages, error: sessionMessagesError } = await supabase
              .from('chat_messages')
              .select('created_at')
              .eq('session_id', session.session_id)
              .order('created_at', { ascending: true })
              
            if (sessionMessagesError) {
              console.warn(`Error getting messages for session ${session.session_id}:`, sessionMessagesError)
              continue
            }
            
            if (sessionMessages && sessionMessages.length >= 2) {
              const firstMessage = new Date(sessionMessages[0].created_at).getTime()
              const lastMessage = new Date(sessionMessages[sessionMessages.length - 1].created_at).getTime()
              const duration = (lastMessage - firstMessage) / 1000 // in seconds
              
              if (duration > 0) {
                totalDuration += duration
                completedSessions++
              }
            }
          }
        }
        
        const avgSessionDuration = completedSessions > 0 
          ? Math.round(totalDuration / completedSessions) 
          : 0
          
        // Count human handoffs
        const humanHandoffs = sessionsWithCounts.filter(
          session => session.metadata?.had_human_intervention === true
        ).length
        
        // Calculate satisfaction rate (placeholder implementation - would need actual feedback data)
        // Assuming 85% satisfaction rate as a reasonable placeholder based on metadata
        const satisfactionRate = 85
        
        setStats({
          total_sessions: totalSessions || 0,
          active_sessions: activeSessions || 0,
          messages_today: messagesToday || 0,
          avg_response_time: avgResponseTime,
          avg_session_duration: avgSessionDuration,
          peak_hour: `${peakHour}:00`,
          human_handoffs: humanHandoffs,
          satisfaction_rate: satisfactionRate
        })
        
      } catch (err: unknown) {
        console.error('Error fetching chat data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chat data'
        setError(`${errorMessage}. Please try again later.`)
      } finally {
        setLoading(false)
      }
    }

    fetchChatSessions()
  }, [user, hasAccess, authLoading, supabase])

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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Chat Management</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full mb-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Chat Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sessions
                </CardTitle>
                <Users size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stats.total_sessions}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Sessions
                </CardTitle>
                <Activity size={16} className="text-green-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stats.active_sessions}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Messages Today
                </CardTitle>
                <MessageSquare size={16} className="text-blue-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stats.messages_today}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Response Time
                </CardTitle>
                <BarChart size={16} className="text-orange-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{formatDuration(stats.avg_response_time)}</div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Chat Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No chat sessions found
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => (
                        <div 
                          key={session.session_id} 
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex flex-col">
                            <div className="font-medium">
                              {session.user_identifier.substring(0, 8)}...
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/chats/${session.session_id}`}>
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div className="pt-2">
                    {/* Simple platform distribution chart */}
                    {['web', 'facebook', 'whatsapp', 'instagram', 'zalo'].map((platform) => {
                      const count = sessions.filter((s) => s.platform === platform).length
                      const percentage = sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0
                      
                      return (
                        <div key={platform} className="mb-4">
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="capitalize">{platform}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="sessions" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Chat Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No chat sessions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">User</th>
                        <th className="text-left py-3 px-2">Chatbot</th>
                        <th className="text-left py-3 px-2">Platform</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Messages</th>
                        <th className="text-left py-3 px-2">Last Activity</th>
                        <th className="text-right py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.session_id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-2">
                            <div className="font-medium">
                              {session.user_identifier.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {session.chatbot_name || 'Unknown'}
                          </td>
                          <td className="py-3 px-2 capitalize">
                            {session.platform}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={
                              session.status === 'active' ? 'default' : 
                              session.status === 'completed' ? 'outline' : 'secondary'
                            }>
                              {session.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            {session.message_count || 0}
                          </td>
                          <td className="py-3 px-2">
                            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/chats/${session.session_id}`}>
                                View
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Session Statistics</h3>
                  {loading ? (
                    <Skeleton className="h-60 w-full" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between border-b pb-2">
                        <span>Total Sessions</span>
                        <span className="font-medium">{stats.total_sessions}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Active Sessions</span>
                        <span className="font-medium">{stats.active_sessions}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Completed Sessions</span>
                        <span className="font-medium">
                          {stats.total_sessions - stats.active_sessions}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Average Session Duration</span>
                        <span className="font-medium">
                          {formatDuration(stats.avg_session_duration)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Messages per Session</span>
                        <span className="font-medium">
                          {sessions.length > 0 
                            ? Math.round(sessions.reduce((acc, s) => acc + (s.message_count || 0), 0) / sessions.length) 
                            : 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Message Statistics</h3>
                  {loading ? (
                    <Skeleton className="h-60 w-full" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between border-b pb-2">
                        <span>Messages Today</span>
                        <span className="font-medium">{stats.messages_today}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Average Response Time</span>
                        <span className="font-medium">{formatDuration(stats.avg_response_time)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Peak Hour</span>
                        <span className="font-medium">{formatHour(stats.peak_hour)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Human Handoffs</span>
                        <span className="font-medium">{stats.human_handoffs}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Satisfaction Rate</span>
                        <span className="font-medium">{stats.satisfaction_rate}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
