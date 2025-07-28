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
import { ArrowLeft, X, Eye, EyeOff, Copy, Code, ExternalLink } from 'lucide-react'
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

  // Generate embed code functions
  const generateIframeCode = () => {
    const chatWidgetUrl = process.env.NEXT_PUBLIC_CHAT_WIDGET_URL || 'http://localhost:3001'
    const embedUrl = new URL('/embed', chatWidgetUrl)
    embedUrl.searchParams.set('chatbotId', chatbotId)
    embedUrl.searchParams.set('n8nWebhookUrl', n8nWebhookUrl)
    embedUrl.searchParams.set('position', config.position)
    embedUrl.searchParams.set('welcomeMessage', config.welcomeMessage)
    if (selectedKnowledgeBases.length > 0) {
      embedUrl.searchParams.set('knowledgeBaseIds', selectedKnowledgeBases.join(','))
    }
    embedUrl.searchParams.set('appearance', encodeURIComponent(JSON.stringify(config.appearance)))

    return `<iframe 
  src="${embedUrl.toString()}"
  width="400" 
  height="600"
  style="position: fixed; ${config.position?.includes('right') ? 'right: 20px;' : 'left: 20px;'} ${config.position?.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'} border: none; z-index: 999999; border-radius: ${config.appearance?.borderRadius || '12px'};"
  title="${name} Chat Widget">
</iframe>`
  }

  const generateScriptCode = () => {
    const chatWidgetUrl = process.env.NEXT_PUBLIC_CHAT_WIDGET_URL || 'http://localhost:3001'
    return `<script>
(function() {
  window.ChatWidget = window.ChatWidget || {};
  window.ChatWidget.init = function(config) {
    const iframe = document.createElement('iframe');
    iframe.src = config.widgetUrl + '/embed?' + new URLSearchParams({
      chatbotId: config.chatbotId,
      n8nWebhookUrl: config.n8nWebhookUrl,
      position: config.position || 'bottom-right',
      welcomeMessage: config.welcomeMessage || 'Hello! How can I help you today?',
      knowledgeBaseIds: (config.knowledgeBaseIds || []).join(','),
      appearance: JSON.stringify(config.appearance || {})
    }).toString();
    
    iframe.style.cssText = \`
      position: fixed;
      \${config.position?.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      \${config.position?.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      width: 400px;
      height: 600px;
      border: none;
      z-index: 999999;
      border-radius: \${config.appearance?.borderRadius || '12px'};
    \`;
    
    document.body.appendChild(iframe);
    return function() { iframe.remove(); };
  };
  
  // Auto-initialize if config is provided
  if (window.ChatWidgetConfig) {
    window.ChatWidget.init(window.ChatWidgetConfig);
  }
})();

// Configuration for this chatbot
window.ChatWidgetConfig = {
  chatbotId: '${chatbotId}',
  widgetUrl: '${chatWidgetUrl}',
  n8nWebhookUrl: '${n8nWebhookUrl}',
  position: '${config.position}',
  welcomeMessage: '${config.welcomeMessage}',
  knowledgeBaseIds: [${selectedKnowledgeBases.map(id => `'${id}'`).join(', ')}],
  appearance: ${JSON.stringify(config.appearance, null, 2)}
};
</script>`
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} code copied to clipboard!`)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error(`Failed to copy ${type} code`)
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

            {/* Embed Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Embed Code
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Copy the embed code to integrate this chatbot into your website
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Iframe Method */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">HTML iframe (Recommended)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generateIframeCode(), 'iframe')}
                      className="h-8"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-100 p-3 rounded-md text-xs overflow-x-auto border">
                      <code>{generateIframeCode()}</code>
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Simple and secure. Just paste this HTML code into your website.
                  </p>
                </div>

                {/* Script Method */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">JavaScript embed (Advanced)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generateScriptCode(), 'script')}
                      className="h-8"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-100 p-3 rounded-md text-xs overflow-x-auto border max-h-48">
                      <code>{generateScriptCode()}</code>
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    More flexible. Allows dynamic configuration and programmatic control.
                  </p>
                </div>

                {/* Integration Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Integration Instructions</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy one of the embed codes above</li>
                    <li>Paste it into your website&apos;s HTML before the closing &lt;/body&gt; tag</li>
                    <li>The chatbot will appear in the {config.position.replace('-', ' ')} corner</li>
                    <li>Test the integration using the preview page below</li>
                  </ol>
                </div>

                {/* Test Page Link */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-amber-900 mb-1">Test Your Integration</h4>
                      <p className="text-sm text-amber-800">
                        Use our test HTML page to verify your chat widget works correctly
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const chatWidgetUrl = process.env.NEXT_PUBLIC_CHAT_WIDGET_URL || 'http://localhost:3001'
                        window.open(`${chatWidgetUrl}/test-iframe.html`, '_blank')
                      }}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Test Page
                    </Button>
                  </div>
                  <div className="mt-3 text-xs text-amber-700">
                    <strong>Instructions:</strong> Open the test page, copy your iframe code above, and paste it into the HTML source to see your widget in action.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ChatbotRoleGuard>
  )
}
