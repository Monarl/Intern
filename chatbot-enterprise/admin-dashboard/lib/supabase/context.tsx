'use client'

import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { getUserRole } from './user-roles'

// Define the type for UserRole from your Supabase database
type UserRole = 'Super Admin' | 'Knowledge Manager' | 'Chatbot Manager' | 'Analyst/Reporter' | 'Support Agent' | null

// Type for the context value
interface SupabaseContextType {
  user: User | null
  userRole: UserRole
  isLoading: boolean
  signOut: () => Promise<void>
}

// Create the context
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

// Create a provider component
export function SupabaseProvider({ 
  children,
  initialUser,
}: { 
  children: React.ReactNode
  initialUser: User | null 
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Function to fetch the user's role using the utility function
    const fetchUserRole = async (userId: string) => {
      try {
        return await getUserRole(userId);
      } catch (error) {
        console.error('Error fetching user role:', error)
        return null;
      }
    }
    
    const getUser = async () => {
      setIsLoading(true)
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
            if (error.message === 'Auth session missing!') {
                console.log("No active session, redirecting to login");
                // If this is a protected route, you might want to redirect
                // router.push('/login');
            } else {
                // Handle other types of errors
                console.error('Authentication error:', error.message);
            }
            setUser(null);
            setUserRole(null);
            return;
            }
        setUser(user)
        if (user) {
          const role = await fetchUserRole(user.id)
          setUserRole(role)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
        setUserRole(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const role = await fetchUserRole(session.user.id)
        setUserRole(role)
      } else {
        setUser(null)
        setUserRole(null)
      }
      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    router.push('/login')
  }

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = {
    user,
    userRole,
    isLoading,
    signOut
  }

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Create a hook for using the context
export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
