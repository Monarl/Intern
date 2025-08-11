'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/lib/supabase/context'
import { ChatbotRoleGuard } from '@/components/chatbots/chatbot-role-guard'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { Bot, Plus, Edit, Trash2, Settings } from 'lucide-react'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager']

interface Chatbot {
  id: string
  name: string
  description: string | null
  knowledge_base_ids: string[]
  n8n_webhook_url: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  owner_id: string | null
  chat_count?: number
  last_activity?: string
}

export default function ChatbotsPage() {
  const { supabase, user } = useSupabase()
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchChatbots = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('chatbots')
        .select(`
          id,
          name,
          description,
          knowledge_base_ids,
          n8n_webhook_url,
          config,
          is_active,
          created_at,
          owner_id
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching chatbots:', error)
        toast.error('Failed to load chatbots')
        return
      }

      // Get chat session counts for each chatbot
      const chatbotsWithStats = await Promise.all(
        (data || []).map(async (chatbot) => {
          const { count } = await supabase
            .from('chat_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('chatbot_id', chatbot.id)

          const { data: lastSession } = await supabase
            .from('chat_sessions')
            .select('updated_at')
            .eq('chatbot_id', chatbot.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...chatbot,
            chat_count: count || 0,
            last_activity: lastSession?.updated_at || null,
          }
        })
      )

      setChatbots(chatbotsWithStats)
    } catch (error) {
      console.error('Error fetching chatbots:', error)
      toast.error('Failed to load chatbots')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (user) {
      fetchChatbots()
    }
  }, [user, fetchChatbots])

  const handleDelete = async (chatbotId: string) => {
    try {
      setDeleting(chatbotId)
      
      const { error } = await supabase
        .from('chatbots')
        .delete()
        .eq('id', chatbotId)

      if (error) {
        console.error('Error deleting chatbot:', error)
        toast.error('Failed to delete chatbot')
        return
      }

      toast.success('Chatbot deleted successfully')
      fetchChatbots()
    } catch (error) {
      console.error('Error deleting chatbot:', error)
      toast.error('Failed to delete chatbot')
    } finally {
      setDeleting(null)
    }
  }

  const toggleActive = async (chatbotId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbots')
        .update({ is_active: !currentStatus })
        .eq('id', chatbotId)

      if (error) {
        console.error('Error updating chatbot status:', error)
        toast.error('Failed to update chatbot status')
        return
      }

      toast.success(`Chatbot ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchChatbots()
    } catch (error) {
      console.error('Error updating chatbot status:', error)
      toast.error('Failed to update chatbot status')
    }
  }

  if (loading) {
    return (
      <ChatbotRoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ChatbotRoleGuard>
    )
  }

  return (
    <ChatbotRoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Chatbots</h1>
            <p className="text-muted-foreground">
              Manage your AI chatbots and their configurations
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/chatbots/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Chatbot
            </Link>
          </Button>
        </div>

        {/* Chatbots Grid */}
        {chatbots.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No chatbots found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first chatbot to get started with AI conversations
              </p>
              <Button asChild>
                <Link href="/dashboard/chatbots/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Chatbot
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{chatbot.name}</CardTitle>
                    </div>
                    <Badge variant={chatbot.is_active ? 'default' : 'secondary'}>
                      {chatbot.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {chatbot.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {chatbot.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Knowledge Bases:</span>
                    <span className="font-medium">{chatbot.knowledge_base_ids.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Chats:</span>
                    <span className="font-medium">{chatbot.chat_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(chatbot.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {chatbot.last_activity && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Activity:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(chatbot.last_activity), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2 border-t">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/chatbots/${chatbot.id}/edit`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant={chatbot.is_active ? 'secondary' : 'default'}
                      onClick={() => toggleActive(chatbot.id, chatbot.is_active)}
                      className="flex-1"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      {chatbot.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chatbot</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{chatbot.name}&quot;? This action cannot be undone and will also delete all related chat sessions and messages.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(chatbot.id)}
                            disabled={deleting === chatbot.id}
                          >
                            {deleting === chatbot.id ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ChatbotRoleGuard>
  )
}
