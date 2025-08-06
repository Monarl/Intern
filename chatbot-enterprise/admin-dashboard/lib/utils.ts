import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format timestamp to Vietnamese date and time
 */
export function formatVietnameseDateTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format timestamp to Vietnamese time only
 */
export function formatVietnameseTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format timestamp to Vietnamese date only
 */
export function formatVietnameseDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Get current Vietnamese time as ISO string
 */
export function getCurrentVietnameseTime(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T') + '+07:00'
}

/**
 * Format relative time in English context
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`
  
  return formatVietnameseDate(timestamp)
}
