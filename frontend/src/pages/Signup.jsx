import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import FlagIcon from '@mui/icons-material/FlagRounded'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { signup } from '../services/authService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Validation — mirrors backend UserSignup Pydantic rules exactly — UNCHANGED
// ---------------------------------------------------------------------------
function validate(fields) {
  const errors = {}
  if (!fields.username.trim()) {
    errors.username = 'Username is required.'
  } else if (fields.username.length < 3) {
    errors.username = 'Username must be at least 3 characters.'
  } else if (fields.username.length > 100) {
    errors.username = 'Username must be 100 characters or fewer.'
  } else if (!/^[a-zA-Z0-9_-]+$/.test(fields.username)) {
    errors.username = 'Only letters, numbers, hyphens, and underscores are allowed.'
  }
  if (!fields.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!fields.password) {
    errors.password = 'Password is required.'
  } else if (fields.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (fields.password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.'
  }
  if (!fields.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  return errors
}

// ---------------------------------------------------------------------------
// Shared field sx — 56px height, 12px radius, primary color focus ring
// ---------------------------------------------------------------------------
const fieldSx = {
  mb: 2,
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    height: 56,
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'primary.main',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: '2px',
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
    },
  },
}

// ---------------------------------------------------------------------------
// Signup Page
// ---------------------------------------------------------------------------
function Signup() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // ---- state — UNCHANGED ----
  const [fields, setFields] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors,       setErrors]       = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [toast,        setToast]        = useState({ open: false, message: '', severity: 'success' })

  // ---- handlers — UNCHANGED ----
  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return }
    setLoading(true)
    try {
      await signup({ username: fields.username, email: fields.email, password: fields.password })
      setToast({ open: true, message: t('Account created! Please sign in.'), severity: 'success' })
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function handleCloseToast() { setToast((prev) => ({ ...prev, open: false })) }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display:   'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 5,
        // Enhanced gradient background with radial highlights
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.35) 0%, transparent 55%),
          radial-gradient(ellipse at 75% 80%, rgba(99,102,241,0.3) 0%, transparent 50%),
          linear-gradient(135deg, #667eea 0%, #764ba2 100%)
        `,
      }}
    >
      {/* Auth card */}
      <Box
        sx={{
          width:          '100%',
          maxWidth:       460,
          borderRadius:   '24px',
          p:              { xs: '28px', sm: '40px' },
          boxShadow:      '0 20px 50px rgba(15,23,42,0.18)',
          border:         '1px solid rgba(255,255,255,0.20)',
          backdropFilter: 'blur(10px)',
          bgcolor:        'rgba(255,255,255,0.97)',
          // Entrance animation
          '@keyframes cardIn': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to:   { opacity: 1, transform: 'translateY(0)'    },
          },
          animation: 'cardIn 0.3s ease both',
        }}
      >
        {/* ---- FeaturePilot Branding ---- */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width:        40,
              height:       40,
              borderRadius: '12px',
              background:   'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              boxShadow:    '0 4px 14px rgba(99,102,241,0.4)',
              mb:           1.25,
            }}
          >
            <FlagIcon sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            FeaturePilot
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', mt: 0.25 }}>
            {t("Release Control Platform")}
          </Typography>
        </Box>

        {/* ---- Page heading ---- */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize:      '1.625rem',
              fontWeight:    800,
              color:         '#0f172a',
              letterSpacing: '-0.02em',
              mb:            0.75,
            }}
          >
            ✨ {t("Create Your Account")}
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: '#64748b', lineHeight: 1.6 }}>
            {t("Start managing feature flags and releases.")}
          </Typography>
        </Box>

        {/* ---- Form — logic UNCHANGED ---- */}
        <Box component="form" onSubmit={handleSubmit} noValidate>

          <TextField
            fullWidth
            id="signup-username"
            label={t("Username")}
            name="username"
            value={fields.username}
            onChange={handleChange}
            error={Boolean(errors.username)}
            helperText={errors.username || t('Letters, numbers, _ and - only.')}
            autoComplete="username"
            slotProps={{ htmlInput: { maxLength: 100 } }}
            disabled={loading}
            sx={fieldSx}
          />

          <TextField
            fullWidth
            id="signup-email"
            label={t("Email")}
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            error={Boolean(errors.email)}
            helperText={errors.email || ' '}
            autoComplete="email"
            disabled={loading}
            sx={fieldSx}
          />

          <TextField
            fullWidth
            id="signup-password"
            label={t("Password")}
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={fields.password}
            onChange={handleChange}
            error={Boolean(errors.password)}
            helperText={errors.password || t('Minimum 8 characters.')}
            autoComplete="new-password"
            disabled={loading}
            sx={fieldSx}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      disabled={loading}
                      size="small"
                    >
                      {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            id="signup-confirm-password"
            label={t("Confirm Password")}
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            value={fields.confirmPassword}
            onChange={handleChange}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword || ' '}
            autoComplete="new-password"
            disabled={loading}
            sx={fieldSx}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirm((v) => !v)}
                      edge="end"
                      disabled={loading}
                      size="small"
                    >
                      {showConfirm ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Submit button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{
              mt:           0.5,
              mb:           2.5,
              height:       56,
              borderRadius: '14px',
              fontWeight:   700,
              fontSize:     '1rem',
              textTransform: 'none',
              boxShadow:    '0 8px 24px rgba(99,102,241,0.30)',
              transition:   'all 0.2s ease',
              '&:hover': {
                boxShadow:  '0 12px 32px rgba(99,102,241,0.45)',
                transform:  'translateY(-2px)',
              },
              '&:active': { transform: 'translateY(0)' },
              '&.Mui-disabled': { opacity: 0.7, transform: 'none', boxShadow: 'none' },
            }}
          >
            {loading
              ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1.5 }} />{t("Creating Account…")}</>
              : t('Create Account')
            }
          </Button>
        </Box>

        {/* ---- Footer link ---- */}
        <Typography sx={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
          {t("Already have an account?")}{' '}
          <Link
            component={RouterLink}
            to="/login"
            underline="none"
            sx={{
              color:      '#6366f1',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              '&:hover': { textDecoration: 'underline', color: '#4f46e5' },
            }}
          >
            {t("Sign In →")}
          </Link>
        </Typography>

      </Box>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: '100%', borderRadius: '12px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Signup
