'use client'

import { useState, useEffect } from 'react'
import { keys, macKeys, type KeySymbols } from '@/lib/utils'

/**
 * Hook that returns platform-specific keyboard symbols.
 * Returns default (non-Mac) values during SSR and initial render,
 * then updates to Mac symbols if running on macOS after hydration.
 */
export function useKeys(): KeySymbols {
  const [currentKeys, setCurrentKeys] = useState<KeySymbols>(keys)

  useEffect(() => {
    const isMac =
      typeof navigator !== 'undefined' &&
      navigator.platform.toUpperCase().indexOf('MAC') >= 0
    if (isMac) {
      setCurrentKeys(macKeys)
    }
  }, [])

  return currentKeys
}

/**
 * Hook that returns whether the current platform is Mac.
 * Always returns false during SSR, then updates client-side.
 */
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        navigator.platform.toUpperCase().indexOf('MAC') >= 0
    )
  }, [])

  return isMac
}
