import { ChatWidget } from '@/components/ChatWidget'
import { platform } from 'os'

export default function HomePage() {
  // Demo configuration - in production, these would come from URL params or script configuration
  const demoConfig = {
    chatbotId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/rag-chat',
    platform: 'web', // Specify the platform for the chat widget
    appearance: {
      primaryColor: '#3b82f6',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px'
    },
    position: 'bottom-right' as const,
    welcomeMessage: 'Hello! I\'m your AI assistant. How can I help you today?'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Professional Chat Widget Demo
        </h1>
        <p className="text-center text-slate-600 mb-12">
          Experience our enhanced chat widget with modern design and smooth interactions
        </p>
        
        <div className="max-w-2xl mx-auto grid gap-8 md:grid-cols-2">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">✨ New Features</h2>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Professional design with shadcn/ui components
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                User messages on right, AI responses on left
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Smooth animations and hover effects
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Enhanced backdrop blur and transparency
              </li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">🚀 How to Use</h2>
            <ol className="space-y-2 text-slate-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm flex items-center justify-center font-medium"></span>
                Click the chat button in the bottom-right corner
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm flex items-center justify-center font-medium"></span>
                Type your message in the input field
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm flex items-center justify-center font-medium"></span>
                Watch the AI respond with helpful information
              </li>
            </ol>
          </div>
        </div>
        
        <div className="max-w-md mx-auto mt-8 bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to Chat?</h3>
            <p className="text-slate-600 text-sm">
              The chat widget is now live and ready for your questions!
            </p>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget {...demoConfig} />
    </div>
  )
}
