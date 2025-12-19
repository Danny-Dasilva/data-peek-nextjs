import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
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
