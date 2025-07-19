import { ChatWidget } from '@/components/ChatWidget'

export default function HomePage() {
  // Demo configuration - in production, these would come from URL params or script configuration
  const demoConfig = {
    chatbotId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/rag-chat',
    appearance: {
      primaryColor: '#3b82f6',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px'
    },
    position: 'bottom-right' as const,
    welcomeMessage: 'Hello! How can I help you today?'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-center mb-8">
          Chat Widget Demo
        </h1>
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600 mb-4">
            This is a demo page showing the chat widget in action.
            Click the chat button in the bottom-right corner to start chatting.
          </p>
          <p className="text-sm text-gray-500">
            The widget can be embedded in any website using a simple script tag.
          </p>
        </div>
      </div>
      
      <ChatWidget {...demoConfig} />
    </div>
  )
}
