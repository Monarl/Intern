'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/context'
import { ChatbotRoleGuard } from '@/components/chatbots/chatbot-role-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChatWidgetPreview } from '@/components/chatbots/ChatWidgetPreview'

// Role-based access control
const ALLOWED_ROLES = ['Super Admin', 'Chatbot Manager']

interface KnowledgeBase {
  id: string
  name: string
  description: string | null
}

interface ChatbotConfig {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  welcomeMessage: string
  appearance: {
    primaryColor: string
    fontFamily: string
    borderRadius: string
  }
}

interface Chatbot {
  id: string
  name: string
  description: string | null
  knowledge_base_ids: string[]
  n8n_webhook_url: string | null
  config: ChatbotConfig
  is_active: boolean
  created_at: string
  owner_id: string | null
}

export default function EditChatbotPage() {
  const router = useRouter()
  const params = useParams()
  const { supabase, user } = useSupabase()
  const chatbotId = params.id as string
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('')
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [config, setConfig] = useState<ChatbotConfig>({
    position: 'bottom-right',
    welcomeMessage: 'Hello! How can I help you today?',
    appearance: {
      primaryColor: '#3b82f6',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px'
    }
  })
  
  // Data and UI state
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [showPreview, setShowPreview] = useState(true)

  // Fetch chatbot data
  const fetchChatbot = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('id', chatbotId)
        .single()

      if (error) {
        console.error('Error fetching chatbot:', error)
        toast.error('Failed to load chatbot')
        router.push('/dashboard/chatbots')
        return
      }

      setChatbot(data)
      setName(data.name)
      setDescription(data.description || '')
      setN8nWebhookUrl(data.n8n_webhook_url || '')
      setSelectedKnowledgeBases(data.knowledge_base_ids || [])
      setIsActive(data.is_active)
      setConfig(data.config || {
        position: 'bottom-right',
        welcomeMessage: 'Hello! How can I help you today?',
        appearance: {
          primaryColor: '#3b82f6',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '12px'
        }
      })
    } catch (error) {
      console.error('Error fetching chatbot:', error)
      toast.error('Failed to load chatbot')
      router.push('/dashboard/chatbots')
    }
  }, [supabase, chatbotId, router])

  // Fetch knowledge bases
  const fetchKnowledgeBases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, name, description')
        .order('name')

      if (error) {
        console.error('Error fetching knowledge bases:', error)
        toast.error('Failed to load knowledge bases')
        return
      }

      setKnowledgeBases(data || [])
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
      toast.error('Failed to load knowledge bases')
    }
  }, [supabase])

  useEffect(() => {
    if (user && chatbotId) {
      Promise.all([fetchChatbot(), fetchKnowledgeBases()])
        .finally(() => setLoadingData(false))
    }
  }, [user, chatbotId, fetchChatbot, fetchKnowledgeBases])

  const handleKnowledgeBaseToggle = (kbId: string) => {
    setSelectedKnowledgeBases(prev => 
      prev.includes(kbId) ? prev.filter(id => id !== kbId) : [...prev, kbId]
    )
  }

  const updateConfig = (key: keyof ChatbotConfig, value: ChatbotConfig[keyof ChatbotConfig]) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateAppearance = (key: keyof ChatbotConfig['appearance'], value: string) => {
    setConfig(prev => {
      const currentAppearance = prev.appearance || {
        primaryColor: '#3b82f6',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '12px'
      }
      
      return {
        ...prev,
        appearance: {
          ...currentAppearance,
          [key]: value
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Please enter a chatbot name')
      return
    }

    if (!n8nWebhookUrl.trim()) {
      toast.error('Please enter an n8n webhook URL')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('chatbots')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          knowledge_base_ids: selectedKnowledgeBases,
          n8n_webhook_url: n8nWebhookUrl.trim(),
          config,
          is_active: isActive
        })
        .eq('id', chatbotId)

      if (error) {
        console.error('Error updating chatbot:', error)
        toast.error('Failed to update chatbot')
        return
      }

      toast.success('Chatbot updated successfully!')
      router.push('/dashboard/chatbots')
    } catch (error) {
      console.error('Error updating chatbot:', error)
      toast.error('Failed to update chatbot')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <ChatbotRoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </ChatbotRoleGuard>
    )
  }

  if (!chatbot) {
    return (
      <ChatbotRoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Chatbot not found</h3>
          <p className="text-muted-foreground mb-4">
            The chatbot you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to access it.
          </p>
          <Button asChild>
            <Link href="/dashboard/chatbots">Back to Chatbots</Link>
          </Button>
        </div>
      </ChatbotRoleGuard>
    )
  }

  return (
    <ChatbotRoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/chatbots">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Chatbot</h1>
            <p className="text-muted-foreground">
              Update your AI chatbot configuration and settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Basic Information</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="active">Active</Label>
                    <Switch
                      id="active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Chatbot Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Customer Support Bot"
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this chatbot does..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook">n8n Webhook URL *</Label>
                  <Input
                    id="webhook"
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="http://localhost:5678/webhook/rag-chat"
                  />
                  <p className="text-sm text-muted-foreground">
                    The n8n workflow endpoint for processing chat messages
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Bases */}
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Bases</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select which knowledge bases this chatbot can access
                </p>
              </CardHeader>
              <CardContent>
                {knowledgeBases.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No knowledge bases found</p>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/knowledge-bases">Create Knowledge Base</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {knowledgeBases.map((kb) => (
                      <div key={kb.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={kb.id}
                          checked={selectedKnowledgeBases.includes(kb.id)}
                          onCheckedChange={() => handleKnowledgeBaseToggle(kb.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={kb.id} className="font-medium cursor-pointer">
                            {kb.name}
                          </Label>
                          {kb.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {kb.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedKnowledgeBases.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Selected Knowledge Bases:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedKnowledgeBases.map(kbId => {
                        const kb = knowledgeBases.find(k => k.id === kbId)
                        return kb ? (
                          <Badge key={kbId} variant="secondary" className="flex items-center gap-1">
                            {kb.name}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleKnowledgeBaseToggle(kbId)}
                            />
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Widget Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Widget Position</Label>
                  <Select value={config.position} onValueChange={(value: ChatbotConfig['position']) => updateConfig('position', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome">Welcome Message</Label>
                  <Textarea
                    id="welcome"
                    value={config.welcomeMessage}
                    onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                    placeholder="Hello! How can I help you today?"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Appearance</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={config.appearance?.primaryColor || '#3b82f6'}
                          onChange={(e) => updateAppearance('primaryColor', e.target.value)}
                          className="w-12 h-10 p-1 rounded border"
                        />
                        <Input
                          value={config.appearance?.primaryColor || '#3b82f6'}
                          onChange={(e) => updateAppearance('primaryColor', e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="borderRadius">Border Radius</Label>
                      <Input
                        id="borderRadius"
                        value={config.appearance?.borderRadius || '12px'}
                        onChange={(e) => updateAppearance('borderRadius', e.target.value)}
                        placeholder="12px"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select 
                      value={config.appearance?.fontFamily || 'system-ui, sans-serif'} 
                      onValueChange={(value: string) => updateAppearance('fontFamily', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                        <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                        <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/chatbots">Cancel</Link>
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Updating...' : 'Update Chatbot'}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Live Preview</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 min-h-[400px] bg-slate-50">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-center mb-2">Live Preview</p>
                      <p className="text-xs text-muted-foreground text-center">
                        This shows how your chatbot widget will appear on websites
                      </p>
                    </div>
                    
                    {/* ChatWidget Preview */}
                    <ChatWidgetPreview
                      chatbotId={chatbotId}
                      n8nWebhookUrl={n8nWebhookUrl || 'http://localhost:5678/webhook/rag-chat'}
                      knowledgeBaseIds={selectedKnowledgeBases}
                      appearance={config.appearance || {
                        primaryColor: '#3b82f6',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '12px'
                      }}
                      position={config.position}
                      welcomeMessage={config.welcomeMessage}
                    />
                    
                    <div className="mt-4 p-3 bg-white rounded border">
                      <p className="text-sm font-medium mb-2">Current Configuration:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Position: {config.position}</div>
                        <div>Color: {config.appearance?.primaryColor || '#3b82f6'}</div>
                        <div>Border Radius: {config.appearance?.borderRadius || '12px'}</div>
                        <div>Font: {config.appearance?.fontFamily || 'system-ui, sans-serif'}</div>
                        <div>Knowledge Bases: {selectedKnowledgeBases.length}</div>
                        <div>Status: {isActive ? 'Active' : 'Inactive'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Preview hidden
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ChatbotRoleGuard>
  )
}
