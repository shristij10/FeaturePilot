// theme.js
// Exports getTheme(mode) — call with 'light' or 'dark' to get the full MUI theme.
// Used by main.jsx which re-calls getTheme whenever the user switches modes.

import { createTheme } from '@mui/material/styles'

// ---------------------------------------------------------------------------
// Brand colours — the same in both themes
// ---------------------------------------------------------------------------
const PRIMARY   = '#6366f1'   // Indigo 500
const PRIMARY_D = '#4f46e5'   // Indigo 600
const PRIMARY_L = '#eef2ff'   // Indigo 50

const SUCCESS   = '#10b981'
const WARNING   = '#f59e0b'
const ERROR     = '#ef4444'
const INFO      = '#3b82f6'

// ---------------------------------------------------------------------------
// Branded shadow levels — shared by both modes
// ---------------------------------------------------------------------------
const BRANDED_SHADOW = '0 4px 24px rgba(99,102,241,0.15)'
const shadows = [
  'none',
  '0 1px 2px rgba(0,0,0,0.05)',
  '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
  '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
  '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.04)',
  '0 20px 25px -5px rgba(0,0,0,0.07), 0 10px 10px -5px rgba(0,0,0,0.03)',
  '0 25px 50px -12px rgba(0,0,0,0.15)',
  '0 25px 50px -12px rgba(0,0,0,0.15)',
  ...Array(17).fill(BRANDED_SHADOW),
]

// ---------------------------------------------------------------------------
// getTheme — factory called by main.jsx with the current mode
// ---------------------------------------------------------------------------
export function getTheme(mode) {
  const isLight = mode !== 'dark'

  // ---- Palette tokens per mode ----
  const bg = isLight
    ? { default: '#eef0f7', paper: '#ffffff' }
    : { default: '#0f172a', paper: '#1e293b' }

  const textColors = isLight
    ? { primary: '#0f172a', secondary: '#475569', disabled: '#94a3b8' }
    : { primary: '#f1f5f9', secondary: '#94a3b8', disabled: '#475569' }

  const dividerColor  = isLight ? '#e2e8f0' : '#334155'
  const grey50        = isLight ? '#f4f5fb' : '#1e293b'
  const grey600       = isLight ? '#475569' : '#94a3b8'
  const grey900       = isLight ? '#0f172a' : '#f1f5f9'
  const grey200       = isLight ? '#e2e8f0' : '#334155'
  const grey400       = isLight ? '#94a3b8' : '#475569'
  const inputBg       = isLight ? '#ffffff' : '#1e293b'
  const tooltipBg     = isLight ? '#0f172a' : '#1e293b'

  return createTheme({
    palette: {
      mode,
      primary: {
        main:         PRIMARY,
        dark:         PRIMARY_D,
        light:        '#818cf8',
        contrastText: '#ffffff',
      },
      success: { main: SUCCESS },
      warning: { main: WARNING },
      error:   { main: ERROR   },
      info:    { main: INFO    },
      background: bg,
      text: textColors,
      divider: dividerColor,
    },

    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      fontWeightRegular: 400,
      fontWeightMedium:  500,
      fontWeightBold:    700,
      h1: { fontSize: '2.5rem',   fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontSize: '2rem',     fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 },
      h3: { fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3  },
      h4: { fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1.1875rem',fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '1.0625rem',fontWeight: 600, lineHeight: 1.5 },
      subtitle1: { fontSize: '1rem',       fontWeight: 600, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.9375rem',  fontWeight: 600, lineHeight: 1.5 },
      body1:     { fontSize: '1rem',       lineHeight: 1.65 },
      body2:     { fontSize: '0.9375rem',  lineHeight: 1.65 },
      caption:   { fontSize: '0.8125rem',  lineHeight: 1.5 },
      button:    { fontSize: '0.9375rem',  fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    },

    shape: { borderRadius: 10 },

    shadows,

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bg.default,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '*::-webkit-scrollbar':       { width: 6, height: 6 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: grey200,
            borderRadius: 99,
            '&:hover': { background: grey400 },
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 20px',
            transition: 'all 0.2s ease',
            '&:hover':  { transform: 'translateY(-1px)' },
            '&:active': { transform: 'translateY(0)' },
          },
          contained: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            '&:hover': { boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${dividerColor}`,
            transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root:       { borderRadius: 16 },
          elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)' },
          elevation8: { boxShadow: '0 10px 40px rgba(0,0,0,0.12)' },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: inputBg,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: PRIMARY,
              borderWidth: 2,
            },
          },
          notchedOutline: {
            borderColor: dividerColor,
            transition: 'border-color 0.2s',
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.9375rem',
            '&.Mui-focused': { color: PRIMARY },
          },
        },
      },

      MuiSelect: {
        styleOverrides: { root: { borderRadius: 10 } },
      },

      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem' },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: grey50,
              color:           grey600,
              fontWeight:      700,
              fontSize:        '0.8125rem',
              textTransform:   'uppercase',
              letterSpacing:   '0.05em',
              borderBottom:    `2px solid ${dividerColor}`,
            },
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover':          { backgroundColor: `${PRIMARY}06` },
            '&:last-child td':  { borderBottom: 0 },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${dividerColor}`,
            fontSize:     '0.9375rem',
            padding:      '13px 16px',
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            boxShadow:    '0 25px 60px rgba(0,0,0,0.15)',
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize:   '1.125rem',
            fontWeight: 700,
            padding:    '24px 24px 8px',
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },

      MuiSnackbar: {
        styleOverrides: {
          root: { '& .MuiAlert-root': { borderRadius: 12 } },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius:    8,
            fontSize:        '0.8125rem',
            backgroundColor: tooltipBg,
            padding:         '6px 12px',
          },
          arrow: { color: tooltipBg },
        },
      },

      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 10, transition: 'all 0.2s ease' },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: 700, fontSize: '0.875rem' },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          root:  { padding: 8 },
          thumb: { boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
          track: { borderRadius: 99 },
        },
      },

      MuiDivider: {
        styleOverrides: { root: { borderColor: dividerColor } },
      },
    },
  })
}

// Keep a default light theme export for any code that imports `theme` directly
// (none currently, but guards against accidental breakage).
export default getTheme('light')
