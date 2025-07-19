import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique session ID using UUID v4
 */
export function generateSessionId(): string {
  return uuidv4()
}

/**
 * Generate a unique user identifier using UUID v4
 */
export function generateUserIdentifier(): string {  
  // Try to get from localStorage first
  if (typeof window !== 'undefined') {
    const existing = localStorage.getItem('chat_user_id')
    if (existing) return existing
    
    const newId = uuidv4()
    localStorage.setItem('chat_user_id', newId)
    return newId
  }
}

/**
 * Format timestamp to readable time format (HH:MM)
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  
  return date.toLocaleDateString()
}
