// This file is deprecated - imports should be updated to use '@/app/lib/supabase' instead
// This is a compatibility layer that re-exports from the new location

import { createClient as appCreateClient } from '@/app/lib/supabase/server'

// Re-export the createClient function from the new location
export async function createClient() {
  return await appCreateClient()
}
