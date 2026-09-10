// Navbar.jsx — redesigned with theme tokens.

import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import MenuIcon         from '@mui/icons-material/MenuRounded'
import BellIcon         from '@mui/icons-material/NotificationsNoneRounded'
import LightModeIcon    from '@mui/icons-material/LightModeRounded'
import DarkModeIcon     from '@mui/icons-material/DarkModeRounded'
import SystemModeIcon   from '@mui/icons-material/SettingsBrightnessRounded'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { SIDEBAR_WIDTH } from './Sidebar'
import LanguageSwitcher from './LanguageSwitcher'
import { getStoredUser } from '../services/authService'
import { useTranslation } from "react-i18next"
import { useColorMode } from '../context/ColorModeContext'

// Page metadata: title + a short description shown in the Navbar subtitle
const PAGE_META = {
  '/dashboard':             { title: 'dashboard',            sub: 'overviewSystem' },
  '/profile':               { title: 'profile',              sub: 'yourAccountDetails' },
  '/environments':          { title: 'environments',         sub: 'manageDeploymentEnvironments' },
  '/feature-flags':         { title: 'featureFlags',         sub: 'createAndManageFeatureFlags' },
  '/environment-overrides': { title: 'environmentOverrides', sub: 'overrideFlagsPerEnvironment' },
  '/flag-evaluation':       { title: 'flagEvaluation',       sub: 'resolveFlagValues' },
  '/audit-logs':            { title: 'auditLogs',            sub: 'trackSystemActivities' },
  '/groups':                { title: 'groupManagement',      sub: 'manageGroups' },
  '/group-members':         { title: 'groupMembers',         sub: 'manageMembers' },
  '/targeting-rules':       { title: 'targetingRules',       sub: 'controlRollout' },
  '/sdk-docs':              { title: 'sdkDocumentation',     sub: 'pythonGuide' },
  '/integration-examples':  { title: 'integrationExamples',  sub: 'readyExamples' },
};

function Navbar({ onMenuClick }) {
  const location = useLocation()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = getStoredUser()
  const { colorMode, setColorMode } = useColorMode()

  const page = PAGE_META[location.pathname] ?? { title: '', sub: '' }

  // Theme toggle menu
  const [anchorEl, setAnchorEl] = useState(null)
  const themeMenuOpen = Boolean(anchorEl)

  const THEME_OPTIONS = [
    { value: 'light',  label: 'Light',          Icon: LightModeIcon  },
    { value: 'dark',   label: 'Dark',            Icon: DarkModeIcon   },
    { value: 'system', label: 'System Default',  Icon: SystemModeIcon },
  ]

  const currentThemeIcon = colorMode === 'dark'
    ? <DarkModeIcon fontSize="small" />
    : colorMode === 'light'
      ? <LightModeIcon fontSize="small" />
      : <SystemModeIcon fontSize="small" />

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width:   { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml:      { md: `${SIDEBAR_WIDTH}px` },
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        backdropFilter: 'blur(8px)',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.92)'
            : 'rgba(255, 255, 255, 0.90)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 60, sm: 64 }, px: { xs: 2, sm: 3 } }}>

        {/* Hamburger — mobile only */}
        <IconButton
          onClick={onMenuClick}
          sx={{
            mr: 1.5,
            display: { md: 'none' },
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          aria-label="Open navigation menu"
        >
          <MenuIcon />
        </IconButton>

        {/* Page title + subtitle */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700, lineHeight: 1.2, mb: 0.50,
            }}
          >
            {t(page.title)}
          </Typography>
          {page.sub && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}
            >
              {t(page.sub)}
            </Typography>
          )}
        </Box>

        {/* Right actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

          {/* Notification bell — placeholder; disabled until backend support is added */}
          <Tooltip title="Notifications coming soon" arrow>
            <span>
              <IconButton
                size="small"
                disabled
                aria-label="Notifications (coming soon)"
                sx={{
                  color: 'text.disabled',
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                }}
              >
                <BellIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* Appearance / theme toggle */}
          <Tooltip title="Appearance" arrow>
            <IconButton
              size="small"
              aria-label="Change appearance"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                color: 'text.secondary',
                width: 36,
                height: 36,
                borderRadius: '10px',
                '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                transition: 'all 0.2s ease',
              }}
            >
              {currentThemeIcon}
            </IconButton>
          </Tooltip>

          {/* Theme menu */}
          <Menu
            anchorEl={anchorEl}
            open={themeMenuOpen}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  minWidth: 180,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid',
                  borderColor: 'divider',
                },
              },
            }}
          >
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <MenuItem
                key={value}
                selected={colorMode === value}
                onClick={() => { setColorMode(value); setAnchorEl(null) }}
                sx={{
                  borderRadius: 1,
                  mx: 0.5,
                  my: 0.25,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }} />
              </MenuItem>
            ))}
          </Menu>

          <LanguageSwitcher />

          {/* Divider line */}
          <Box sx={{ width: 1, height: 28, bgcolor: 'divider', mx: 0.5 }} />

          {/* User pill — navigates to /profile on click */}
          <Tooltip title={t("viewProfile")} arrow>
            <Box
              onClick={() => navigate('/profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.15)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  fontSize: 12,
                  fontWeight: 800,
                  boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
                }}
              >
                {user?.username?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.8125rem' }}
              >
                {user?.username ?? 'User'}
              </Typography>
            </Box>
          </Tooltip>

        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
