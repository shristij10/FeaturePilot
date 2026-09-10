// Home.jsx
// The root "/" route.
// Redirects authenticated users straight to the dashboard,
// unauthenticated users to the login page.
// This avoids a dead landing page and makes the "/" path useful.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { getStoredUser } from '../services/authService'

function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const user = getStoredUser()
    // Redirect based on whether the user is already logged in
    if (user) {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Briefly visible while the redirect resolves
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <CircularProgress sx={{ color: '#fff' }} />
    </Box>
  )
}

export default Home
