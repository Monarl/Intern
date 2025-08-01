/**
 * Vietnamese Timezone Utilities
 * 
 * This module provides utilities for handling Vietnamese timezone (UTC+7)
 * across the entire application. Use these functions for consistent
 * time formatting and display.
 */

/**
 * Vietnamese timezone configuration
 */
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const VIETNAM_LOCALE = 'vi-VN'
export const VIETNAM_UTC_OFFSET = '+07:00'

/**
 * Date formatting options for Vietnamese locale
 */
export const vietnameseDateFormats = {
  full: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    timeZone: VIETNAM_TIMEZONE
  },
  date: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    timeZone: VIETNAM_TIMEZONE
  },
  time: {
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    timeZone: VIETNAM_TIMEZONE
  },
  shortDateTime: {
    year: 'numeric' as const,
    month: 'short' as const,
    day: 'numeric' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    timeZone: VIETNAM_TIMEZONE
  }
}

/**
 * Class for handling Vietnamese timezone operations
 */
export class VietnameseTime {
  /**
   * Get current Vietnamese time as Date object
   */
  static now(): Date {
    return new Date()
  }

  /**
   * Get current Vietnamese time as ISO string with timezone
   */
  static nowISO(): string {
    return new Date().toLocaleString('sv-SE', { timeZone: VIETNAM_TIMEZONE }).replace(' ', 'T') + VIETNAM_UTC_OFFSET
  }

  /**
   * Convert any date to Vietnamese timezone display
   */
  static format(date: Date | string, format: keyof typeof vietnameseDateFormats = 'full'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString(VIETNAM_LOCALE, vietnameseDateFormats[format])
  }

  /**
   * Format as relative time in Vietnamese
   */
  static relative(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'vừa xong'
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} ngày trước`
    
    return VietnameseTime.format(dateObj, 'date')
  }

  /**
   * Check if a date is today in Vietnamese timezone
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    
    const dateVN = dateObj.toLocaleDateString(VIETNAM_LOCALE, vietnameseDateFormats.date)
    const todayVN = today.toLocaleDateString(VIETNAM_LOCALE, vietnameseDateFormats.date)
    
    return dateVN === todayVN
  }

  /**
   * Get start of day in Vietnamese timezone
   */
  static startOfDay(date?: Date | string): Date {
    const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
    const vnDate = dateObj.toLocaleDateString('sv-SE', { timeZone: VIETNAM_TIMEZONE })
    return new Date(vnDate + 'T00:00:00' + VIETNAM_UTC_OFFSET)
  }

  /**
   * Get end of day in Vietnamese timezone
   */
  static endOfDay(date?: Date | string): Date {
    const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
    const vnDate = dateObj.toLocaleDateString('sv-SE', { timeZone: VIETNAM_TIMEZONE })
    return new Date(vnDate + 'T23:59:59' + VIETNAM_UTC_OFFSET)
  }

  /**
   * Parse Vietnamese date string to Date object
   */
  static parse(vietnameseDateString: string): Date {
    // Handle common Vietnamese date formats
    // DD/MM/YYYY or DD-MM-YYYY
    const datePattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    const match = vietnameseDateString.match(datePattern)
    
    if (match) {
      const [, day, month, year] = match
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00${VIETNAM_UTC_OFFSET}`)
    }
    
    // Fallback to standard parsing
    return new Date(vietnameseDateString)
  }
}

/**
 * Utility functions for backward compatibility
 */
export const formatVietnameseDateTime = (timestamp: string) => VietnameseTime.format(timestamp, 'full')
export const formatVietnameseTime = (timestamp: string) => VietnameseTime.format(timestamp, 'time')
export const formatVietnameseDate = (timestamp: string) => VietnameseTime.format(timestamp, 'date')
export const getCurrentVietnameseTime = () => VietnameseTime.nowISO()
export const formatRelativeTime = (timestamp: string) => VietnameseTime.relative(timestamp)
