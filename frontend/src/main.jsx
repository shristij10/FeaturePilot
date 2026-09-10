import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ColorModeProvider, useColorMode } from './context/ColorModeContext'
import { getTheme } from './styles/theme'
import './index.css'
import './i18n'
import App from './App.jsx'

// ---------------------------------------------------------------------------
// ThemedApp — sits inside ColorModeProvider so it can read the current mode
// and re-build the MUI theme whenever the user switches appearance.
// ---------------------------------------------------------------------------
function ThemedApp() {
  const { mode } = useColorMode()
  // Re-create theme only when mode changes — useMemo prevents unnecessary work
  const theme = useMemo(() => getTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline applies background colour, font smoothing, scrollbars */}
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeProvider>
      <ThemedApp />
    </ColorModeProvider>
  </StrictMode>,
)
