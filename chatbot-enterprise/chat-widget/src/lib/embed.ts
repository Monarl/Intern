import type { ChatWidgetConfig } from '@/types/chat'

export interface EmbedConfig extends Omit<ChatWidgetConfig, 'supabaseUrl' | 'supabaseAnonKey'> {
  widgetUrl: string // The URL where the chat widget is hosted
}

export function createChatWidget(config: EmbedConfig) {
  // Create iframe container
  const iframe = document.createElement('iframe')
  iframe.id = 'chat-widget-iframe'
  iframe.src = `${config.widgetUrl}/embed?${new URLSearchParams({
    chatbotId: config.chatbotId,
    n8nWebhookUrl: config.n8nWebhookUrl,
    position: config.position || 'bottom-right',
    welcomeMessage: config.welcomeMessage || 'Hello! How can I help you today?',
    ...(config.appearance && { appearance: JSON.stringify(config.appearance) })
  }).toString()}`
  
  iframe.style.cssText = `
    position: fixed;
    ${config.position?.includes('right') ? 'right: 20px;' : 'left: 20px;'}
    ${config.position?.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
    width: 400px;
    height: 600px;
    border: none;
    z-index: 999999;
    background: transparent;
  `
  
  // Add to page
  document.body.appendChild(iframe)
  
  // Return cleanup function
  return () => {
    iframe.remove()
  }
}

// Global function for easy embedding
declare global {
  interface Window {
    ChatWidget: {
      init: (config: EmbedConfig) => () => void
    }
  }
}

if (typeof window !== 'undefined') {
  window.ChatWidget = {
    init: createChatWidget
  }
}
