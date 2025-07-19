import { Suspense } from 'react'
import { ChatWidget } from '@/components/ChatWidget'

interface EmbedPageProps {
  searchParams: Promise<{
    chatbotId?: string
    n8nWebhookUrl?: string
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    welcomeMessage?: string
    appearance?: string
  }>
}

async function EmbedPageContent({ searchParams }: EmbedPageProps) {
  const params = await searchParams
  const {
    chatbotId,
    n8nWebhookUrl,
    position = 'bottom-right',
    welcomeMessage = 'Hello! How can I help you today?',
    appearance
  } = params

  if (!chatbotId || !n8nWebhookUrl) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Missing required parameters: chatbotId and n8nWebhookUrl
      </div>
    )
  }

  const parsedAppearance = appearance ? JSON.parse(decodeURIComponent(appearance)) : {}

  return (
    <div className="w-full h-screen bg-transparent">
      <ChatWidget
        chatbotId={chatbotId}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}
        n8nWebhookUrl={n8nWebhookUrl}
        position={position}
        welcomeMessage={welcomeMessage}
        appearance={parsedAppearance}
      />
    </div>
  )
}

export default function EmbedPage(props: EmbedPageProps) {
  return (
    <Suspense fallback={<div>Loading chat widget...</div>}>
      <EmbedPageContent {...props} />
    </Suspense>
  )
}
