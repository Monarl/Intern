import { Suspense } from 'react'
import { ChatWidget } from '@/components/ChatWidget'

interface EmbedPageProps {
  searchParams: Promise<{
    chatbotId?: string
    n8nWebhookUrl?: string
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    welcomeMessage?: string
    appearance?: string
    knowledgeBaseIds?: string
  }>
}

async function EmbedPageContent({ searchParams }: EmbedPageProps) {
  const params = await searchParams
  const {
    chatbotId,
    n8nWebhookUrl,
    position = 'bottom-right',
    welcomeMessage = 'Hello! How can I help you today?',
    appearance,
    knowledgeBaseIds
  } = params

  if (!chatbotId || !n8nWebhookUrl) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          color: '#ef4444',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        Missing required parameters: chatbotId and n8nWebhookUrl
      </div>
    )
  }

  const parsedAppearance = appearance ? JSON.parse(decodeURIComponent(appearance)) : {}
  const parsedKnowledgeBaseIds = knowledgeBaseIds ? knowledgeBaseIds.split(',') : []

  return (
    <ChatWidget
      chatbotId={chatbotId}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}
      n8nWebhookUrl={n8nWebhookUrl}
      platform="web"
      position={position}
      welcomeMessage={welcomeMessage}
      appearance={parsedAppearance}
      knowledgeBaseIds={parsedKnowledgeBaseIds}
    />
  )
}

export default function EmbedPage(props: EmbedPageProps) {
  return (
    <div data-embed="true" className="embed-mode">
      <Suspense fallback={
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            color: '#64748b'
          }}
        >
          Loading chat widget...
        </div>
      }>
        <EmbedPageContent {...props} />
      </Suspense>
    </div>
  )
}
