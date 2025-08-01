/**
 * Vietnamese Timezone Utilities for Chat Widget
 * 
 * This module provides utilities for handling Vietnamese timezone (UTC+7)
 * in the chat widget. Use these functions for consistent time formatting.
 */

/**
 * Vietnamese timezone configuration
 */
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const VIETNAM_LOCALE = 'vi-VN'
export const VIETNAM_UTC_OFFSET = '+07:00'

/**
 * Class for handling Vietnamese timezone operations
 */
export class VietnameseTime {
  /**
   * Get current Vietnamese time as ISO string with timezone
   */
  static nowISO(): string {
    return new Date().toLocaleString('sv-SE', { timeZone: VIETNAM_TIMEZONE }).replace(' ', 'T') + VIETNAM_UTC_OFFSET
  }

  /**
   * Format timestamp for chat display (relative time)
   */
  static formatChatTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    
    // Format date in Vietnamese timezone
    return date.toLocaleDateString(VIETNAM_LOCALE, { timeZone: VIETNAM_TIMEZONE })
  }

  /**
   * Format timestamp to Vietnamese date and time
   */
  static format(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleString(VIETNAM_LOCALE, { 
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * Check if timestamp is from today in Vietnamese timezone
   */
  static isToday(timestamp: string): boolean {
    const date = new Date(timestamp)
    const today = new Date()
    
    const dateVN = date.toLocaleDateString(VIETNAM_LOCALE, { timeZone: VIETNAM_TIMEZONE })
    const todayVN = today.toLocaleDateString(VIETNAM_LOCALE, { timeZone: VIETNAM_TIMEZONE })
    
    return dateVN === todayVN
  }
}
