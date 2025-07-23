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
  sessionId: string  // Now the primary key
  chatbotId: string
  userIdentifier?: string
  platform: string
  status: 'active' | 'completed' | 'abandoned'
  metadata?: any
  createdAt: string
  updatedAt: string
}

export interface ChatWidgetConfig {
  chatbotId: string
  supabaseUrl: string
  supabaseAnonKey: string
  n8nWebhookUrl: string
  platform: string
  knowledgeBaseIds?: string[]
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
  knowledgeBaseIds?: string[]
  metadata?: any
}

export interface N8nChatResponse {
  response: string
  sessionId: string
  messageId?: string  // Optional ID of the message in database
  metadata?: {
    sources?: string[]
    confidence?: number
    handoffRequired?: boolean
  }
}
