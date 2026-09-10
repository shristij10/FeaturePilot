// NotFound.jsx
// Catch-all 404 page — styled to match the rest of the application.
// Shown whenever the user navigates to a route that doesn't exist.

import { Box, Button, Typography } from '@mui/material'
import FlagIcon from '@mui/icons-material/FlagRounded'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../services/authService'
import { useTranslation } from 'react-i18next'

function NotFound() {
  const navigate  = useNavigate()
  const { t } = useTranslation()
  const isLoggedIn = Boolean(getStoredUser())

  function handleGoHome() {
    navigate(isLoggedIn ? '/dashboard' : '/login', { replace: true })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.25) 0%, transparent 55%),
          radial-gradient(ellipse at 75% 80%, rgba(99,102,241,0.2) 0%, transparent 50%),
          linear-gradient(135deg, #667eea 0%, #764ba2 100%)
        `,
        textAlign: 'center',
      }}
    >
      {/* Logo mark */}
      <Box
        sx={{
          width:        56,
          height:       56,
          borderRadius: '16px',
          background:   'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(8px)',
          border:       '1px solid rgba(255,255,255,0.35)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          mb:           3,
        }}
      >
        <FlagIcon sx={{ fontSize: 28, color: '#fff' }} />
      </Box>

      {/* 404 headline */}
      <Typography
        sx={{
          fontSize:      { xs: '5rem', sm: '7rem' },
          fontWeight:    900,
          lineHeight:    1,
          color:         '#fff',
          letterSpacing: '-0.04em',
          mb:            1,
          // Subtle text shadow for depth
          textShadow:   '0 4px 24px rgba(0,0,0,0.2)',
        }}
      >
        404
      </Typography>

      {/* Title */}
      <Typography
        sx={{
          fontSize:   { xs: '1.25rem', sm: '1.625rem' },
          fontWeight: 700,
          color:      '#fff',
          mb:         1.5,
        }}
      >
        {t("Page not found")}
      </Typography>

      {/* Subtitle */}
      <Typography
        sx={{
          fontSize:  '1rem',
          color:     'rgba(255,255,255,0.75)',
          maxWidth:  400,
          lineHeight: 1.6,
          mb:        4,
        }}
      >
        {t("The page you're looking for doesn't exist or has been moved.")}
      </Typography>

      {/* CTA button */}
      <Button
        variant="contained"
        size="large"
        onClick={handleGoHome}
        sx={{
          bgcolor:      '#fff',
          color:        '#6366f1',
          fontWeight:   700,
          fontSize:     '0.9375rem',
          borderRadius: '14px',
          px:           4,
          py:           1.5,
          boxShadow:    '0 8px 24px rgba(0,0,0,0.15)',
          transition:   'all 0.2s ease',
          '&:hover': {
            bgcolor:    '#f8fafc',
            boxShadow:  '0 12px 32px rgba(0,0,0,0.2)',
            transform:  'translateY(-2px)',
          },
          '&:active': { transform: 'translateY(0)' },
        }}
      >
        {isLoggedIn ? t("Back to Dashboard") : t("Go to Login")}
      </Button>
    </Box>
  )
}

export default NotFound
