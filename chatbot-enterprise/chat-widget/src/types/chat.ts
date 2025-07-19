export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    typing?: boolean
    error?: boolean
    sources?: string[]
    isWelcome?: boolean
    [key: string]: any
  }
}

export interface ChatSession {
  id: string
  sessionId: string
  chatbotId: string
  userIdentifier?: string
  platform: string
  status: 'active' | 'ended' | 'transferred'
  metadata?: any
  createdAt: string
  updatedAt: string
}

export interface ChatWidgetConfig {
  chatbotId: string
  supabaseUrl: string
  supabaseAnonKey: string
  n8nWebhookUrl: string
  appearance?: {
    primaryColor?: string
    fontFamily?: string
    borderRadius?: string
  }
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  welcomeMessage?: string
}

export interface N8nChatRequest {
  message: string
  sessionId: string
  chatbotId: string
  userIdentifier?: string
  metadata?: any
}

export interface N8nChatResponse {
  response: string
  sessionId: string
  metadata?: {
    sources?: string[]
    confidence?: number
    handoffRequired?: boolean
  }
}
