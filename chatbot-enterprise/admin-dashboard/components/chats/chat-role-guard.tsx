'use client'

import { ReactNode } from 'react'
import { useSupabase } from '@/lib/supabase/context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ChatRoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallbackMessage?: string
  fallbackAction?: ReactNode
}

export function ChatRoleGuard({
  children,
  allowedRoles,
  fallbackMessage = 'You do not have permission to access this feature.',
  fallbackAction,
}: ChatRoleGuardProps) {
  const { userRole, isLoading } = useSupabase()

  const hasAccess = allowedRoles.includes(userRole as string)

  if (isLoading) {
    return <div className="p-4 text-sm">Loading permissions...</div>
  }

  if (!hasAccess) {
    return (
      <div className="p-4 border rounded-lg bg-slate-50 text-center">
        <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
        <p className="text-muted-foreground mb-4">{fallbackMessage}</p>
        
        {fallbackAction || (
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        )}
      </div>
    )
  }

  return <>{children}</>
}
