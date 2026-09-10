// ColorModeContext.jsx
// Provides Light / Dark / System appearance preference across the entire app.
// - Reads persisted choice from localStorage ('fms_color_mode')
// - Falls back to OS preference via prefers-color-scheme
// - Exposes { mode, colorMode, setColorMode } via context
// - Updates the MUI ThemeProvider in main.jsx instantly without a page refresh

import { createContext, useContext, useMemo, useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'fms_color_mode'

/** Read the OS dark-mode preference. */
function getSystemMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Read the persisted preference, fall back to 'system'. */
function getStoredPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch { /* localStorage unavailable */ }
  return 'system'
}

/** Resolve the actual MUI palette mode from a preference string. */
function resolveMode(preference) {
  if (preference === 'light') return 'light'
  if (preference === 'dark')  return 'dark'
  return getSystemMode()  // 'system'
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const ColorModeContext = createContext({
  /** 'light' | 'dark' | 'system' — the stored preference */
  colorMode: 'system',
  /** 'light' | 'dark' — the resolved MUI palette mode */
  mode: 'light',
  /** Update the preference and persist it */
  setColorMode: () => {},
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ColorModeProvider({ children }) {
  const [colorMode, setColorModeState] = useState(getStoredPreference)
  const [mode, setMode] = useState(() => resolveMode(getStoredPreference()))

  // Keep `mode` in sync when the OS preference changes (e.g. user changes
  // their OS setting while the app is open) and when colorMode is 'system'.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (colorMode === 'system') {
        setMode(getSystemMode())
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [colorMode])

  function setColorMode(newPreference) {
    setColorModeState(newPreference)
    setMode(resolveMode(newPreference))
    try { localStorage.setItem(STORAGE_KEY, newPreference) } catch { /* ignore */ }
  }

  const value = useMemo(() => ({ colorMode, mode, setColorMode }), [colorMode, mode])

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useColorMode() {
  return useContext(ColorModeContext)
}
