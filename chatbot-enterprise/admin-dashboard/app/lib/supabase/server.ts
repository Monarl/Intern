'use server'

import { createServerClient} from '@supabase/ssr'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // read all incoming cookies
        getAll: () => cookieStore.getAll(),

        // queue up all Set-Cookie headers
        setAll: (/*cookiesToSet*/) => {
        //   try {
        //     cookiesToSet.forEach(({ name, value, options }) =>
        //       cookieStore.set(name, value, options)
        //     )
        //   } catch {
        //     // This will throw in Server Components—safe to ignore there.
        //     // Actual cookie‐writes happen in your middleware (below).
        //   }
        },
      },
    }
  )
}

/**
 * Admin client (service-role key) — bypasses RLS entirely
 */
export async function createAdminClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}