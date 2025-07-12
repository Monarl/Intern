import { createServerClient} from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for api routes and static files
  if (pathname.includes('/api/') || pathname.match(/\.(jpe?g|png|svg|ico)$/)) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // read all cookies from the incoming request
        getAll: () => request.cookies.getAll(),

        // queue up all Set-Cookie headers to the outgoing response
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}
