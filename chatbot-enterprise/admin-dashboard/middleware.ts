import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bypass authentication for non-dashboard routes (login, register, etc.)
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }
  
  // Check if request is for dashboard paths
  const isDashboardPath = pathname.startsWith('/dashboard')
  
  if (isDashboardPath) {
    // Create a supabase client
    const supabase = await createClient()
    
    // Check user authentication
    const { data: { session } } = await supabase.auth.getSession()
    
    // If no session, redirect to login
    if (!session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', encodeURIComponent(pathname))
      return NextResponse.redirect(redirectUrl)
    }
  }
  
  return NextResponse.next()
}

// Configure matcher for dashboard paths only
export const config = {
  matcher: [
    // Skip auth API routes and static files
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
