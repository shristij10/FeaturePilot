// DashboardLayout.jsx — improved spacing and background.

import { useState } from 'react'
import { Box, Toolbar } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Sidebar, { SIDEBAR_WIDTH } from '../components/Sidebar'
import Navbar from '../components/Navbar'

function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width:    { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minHeight: '100vh',
          // Subtle dot grid — uses theme tokens so it works in both light and dark mode
          backgroundColor: 'background.default',
          backgroundImage: (theme) =>
            `radial-gradient(circle, ${theme.palette.divider} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        {/* Spacer matches the fixed AppBar height */}
        <Toolbar sx={{ minHeight: { xs: 60, sm: 64 } }} />

        {/* Page content area — maxWidth:1500, full width, px:5 (40px) */}
        <Box
          sx={{
            px:       { xs: 2.5, sm: 4, lg: 5 },
            pt:       { xs: 3, sm: 5 },
            pb:       { xs: 4, sm: 6 },
            maxWidth: 1500,
            width:    '100%',
            mx:       'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default DashboardLayout
