import { Metadata } from 'next'
import { createClient } from '@/app/lib/supabase/server'
import UserRoleInfo from '@/components/UserRoleInfo'

export const metadata: Metadata = {
  title: 'Dashboard | Chatbot Enterprise',
  description: 'Admin dashboard for managing Chatbot Enterprise',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get counts for the dashboard
  const [
    { count: knowledgeBaseCount },
    { count: documentCount },
    { count: userCount }
  ] = await Promise.all([
    supabase.from('knowledge_bases').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('user_role_mappings').select('*', { count: 'exact', head: true }),
  ])

  // Format stats for display
  const stats = [
    { name: 'Knowledge Bases', value: knowledgeBaseCount || 0 },
    { name: 'Documents', value: documentCount || 0 },
    { name: 'Users', value: userCount || 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to the Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your chatbot settings, knowledge bases, and user access
        </p>
      </div>

      {/* User Role Info */}
      <div className="mb-8">
        <UserRoleInfo />
      </div>
        
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg overflow-hidden shadow"
          >
            <div className="p-6">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium">Recent Activity</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500">No recent activity to display</p>
        </div>
      </div>
    </div>
  )
}
