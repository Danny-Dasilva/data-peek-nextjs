import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() when available, falls back to manual generation
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments where crypto.randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Key symbols interface for platform-specific shortcuts
 */
export interface KeySymbols {
  mod: string
  alt: string
  shift: string
  enter: string
}

/**
 * Platform-specific modifier key symbols
 * Default to non-Mac values for SSR consistency - use useKeys() hook for client-side detection
 */
export const keys: KeySymbols = {
  mod: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter'
}

/**
 * Mac-specific key symbols
 */
export const macKeys: KeySymbols = {
  mod: '⌘',
  alt: '⌥',
  shift: '⇧',
  enter: '↵'
}
