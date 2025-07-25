'use client'

import { useState, useEffect } from 'react'

interface ChatWidgetPreviewProps {
  chatbotId: string
  n8nWebhookUrl: string
  knowledgeBaseIds: string[]
  appearance: {
    primaryColor?: string
    fontFamily?: string
    borderRadius?: string
  }
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  welcomeMessage: string
}

export function ChatWidgetPreview({
  chatbotId,
  n8nWebhookUrl,
  knowledgeBaseIds,
  appearance,
  position,
  welcomeMessage
}: ChatWidgetPreviewProps) {
  const [iframeKey, setIframeKey] = useState(0)
  const [iframeError, setIframeError] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Force iframe reload when props change
  useEffect(() => {
    setIframeKey(prev => prev + 1)
    setIframeError(false)
    setIframeLoaded(false)
  }, [chatbotId, n8nWebhookUrl, knowledgeBaseIds, appearance, position, welcomeMessage])

  // Build the embed URL with query parameters
  const chatWidgetUrl = process.env.NEXT_PUBLIC_CHAT_WIDGET_URL || 'http://localhost:3001'
  const embedUrl = new URL('/embed', chatWidgetUrl)
  embedUrl.searchParams.set('chatbotId', chatbotId)
  embedUrl.searchParams.set('n8nWebhookUrl', n8nWebhookUrl)
  embedUrl.searchParams.set('position', position)
  embedUrl.searchParams.set('welcomeMessage', welcomeMessage)
  if (knowledgeBaseIds.length > 0) {
    embedUrl.searchParams.set('knowledgeBaseIds', knowledgeBaseIds.join(','))
  }
  embedUrl.searchParams.set('appearance', encodeURIComponent(JSON.stringify(appearance)))

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    setIframeError(false)
  }

  const handleIframeError = () => {
    setIframeError(true)
    setIframeLoaded(false)
  }

  if (iframeError) {
    return (
      <ChatWidgetPreviewFallback
        appearance={appearance}
        position={position}
        welcomeMessage={welcomeMessage}
      />
    )
  }

  return (
    <div className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600">Loading preview...</p>
          </div>
        </div>
      )}
      
      <iframe
        key={iframeKey}
        src={embedUrl.toString()}
        className="w-full h-full border-none"
        title="Chat Widget Preview"
        allow="web-share"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-storage-access-by-user-activation"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
      
      {/* Preview overlay info */}
      <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
        Live Preview
      </div>
      
      {/* Position indicator */}
      <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
        Position: {position}
      </div>
    </div>
  )
}

// Fallback component when chat widget is not available
export function ChatWidgetPreviewFallback({
  appearance,
  position,
  welcomeMessage
}: Partial<ChatWidgetPreviewProps>) {
  return (
    <div className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-lg flex items-center justify-center">
          <div 
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: appearance?.primaryColor || '#3b82f6' }}
          />
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <p className="text-sm text-gray-800">
            {welcomeMessage || 'Hello! How can I help you today?'}
          </p>
        </div>
        <div className="text-xs text-gray-500">
          Preview - Position: {position || 'bottom-right'}
        </div>
      </div>
      
      {/* Fallback notice */}
      <div className="absolute top-2 left-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded px-2 py-1 text-xs">
        Live preview unavailable - showing mockup
      </div>
    </div>
  )
}
