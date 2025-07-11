// This file re-exports the createClient functions from the appropriate files
// It allows for easy imports in both server and client components

// Re-export the server createClient
export { createClient } from './server'

// We don't re-export from client here to prevent server components from accidentally 
// using the client version
