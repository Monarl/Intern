import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getUserRole } from '@/lib/supabase/user-roles'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { pathname } = request.nextUrl

  // Bypass authentication for non-dashboard routes (login, register, etc.)
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/']
  if (publicPaths.includes(pathname)) {
    return response
  }
  
  // Check if request is for dashboard paths
  const isDashboardPath = pathname.startsWith('/dashboard')
  
  if (isDashboardPath) {
    // Create a supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Check user authentication
    const { data: { user } } = await supabase.auth.getUser()
    
    // If no user, redirect to login
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', encodeURIComponent(pathname))
      return NextResponse.redirect(redirectUrl)
    }
    
    // Check user role for protected routes
    if (pathname.includes('/admin') || pathname.includes('/knowledge-management')) {
      const userRole = await getUserRole(user.id)
      
      // Only allow Super Admin and Knowledge Manager to access specific areas
      if (pathname.includes('/admin') && userRole !== 'Super Admin') {
        // Redirect to dashboard with access denied message
        const redirectUrl = new URL('/dashboard', request.url)
        redirectUrl.searchParams.set('error', 'access_denied')
        return NextResponse.redirect(redirectUrl)
      }
      
      if (pathname.includes('/knowledge-management') && 
          userRole !== 'Super Admin' && 
          userRole !== 'Knowledge Manager') {
        // Redirect to dashboard with access denied message
        const redirectUrl = new URL('/dashboard', request.url)
        redirectUrl.searchParams.set('error', 'access_denied')
        return NextResponse.redirect(redirectUrl)
      }
    }
  }
  
  return response
}

// Configure matcher for dashboard paths only
export const config = {
  matcher: [
    // Skip auth API routes and static files
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
