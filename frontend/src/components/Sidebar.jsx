// Sidebar.jsx — redesigned with the new theme tokens.

import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Tooltip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/DashboardRounded'
import PersonIcon from '@mui/icons-material/PersonRounded'
import EnvironmentsIcon from '@mui/icons-material/CloudRounded'
import FeatureFlagsIcon from '@mui/icons-material/FlagRounded'
import FlagRounded from '@mui/icons-material/FlagRounded'
import OverridesIcon from '@mui/icons-material/TuneRounded'
import EvaluationIcon from '@mui/icons-material/RuleFolderRounded'
import AuditIcon from '@mui/icons-material/HistoryRounded'
import GroupsIcon from '@mui/icons-material/GroupsRounded'
import GroupMembersIcon from '@mui/icons-material/ManageAccountsRounded'
import TargetingIcon from '@mui/icons-material/TrackChangesRounded'
import LogoutIcon from '@mui/icons-material/LogoutRounded'
import IntegrationIcon from '@mui/icons-material/IntegrationInstructionsRounded'
import BookIcon from '@mui/icons-material/MenuBookRounded'
import { useNavigate, useLocation } from 'react-router-dom'
import { logout, getStoredUser } from '../services/authService'
import { useTranslation } from "react-i18next";

export const SIDEBAR_WIDTH = 300

const NAV_ITEMS = [
  { label: "dashboard",             path: '/dashboard',             icon: <DashboardIcon    />, },
  { label: "profile",               path: '/profile',               icon: <PersonIcon       />, },
  { label: "environments",          path: '/environments',          icon: <EnvironmentsIcon />, },
  { label: 'Feature Flags',         path: '/feature-flags',         icon: <FeatureFlagsIcon />, },
  { label: 'Environment Overrides', path: '/environment-overrides', icon: <OverridesIcon    />, },
  { label: 'Flag Evaluation',       path: '/flag-evaluation',       icon: <EvaluationIcon   />, },
  { label: 'Audit Logs',            path: '/audit-logs',            icon: <AuditIcon        />, },
  { label: 'Group Management',      path: '/groups',                icon: <GroupsIcon       />, },
  { label: 'Group Members',         path: '/group-members',         icon: <GroupMembersIcon />, },
  { label: 'Targeting Rules',       path: '/targeting-rules',       icon: <TargetingIcon    />, },
  // ---- SDK / Developer section ----
  { label: 'SDK Documentation',     path: '/sdk-docs',              icon: <BookIcon         />, section: 'Developer' },
  { label: 'Integration Examples',  path: '/integration-examples',  icon: <IntegrationIcon  />, },
]

function SidebarContent({ onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const location = useLocation()
  const user     = getStoredUser()

  function handleNav(path) { navigate(path); onClose() }
  function handleLogout()  { logout(); navigate('/login') }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#0f172a',    // slate-900 — dark sidebar for strong contrast
        color: '#fff',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Brand strip                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Box sx={{ px: 3.5, pt: 3.5, pb: 2.5 }}>
        {/* Logo mark — small coloured square beside the app name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}
          >
            <FlagRounded sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ color: '#fff', lineHeight: 1.2, fontSize: '1rem', letterSpacing: '-0.01em' }}
            >
              FeaturePilot
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1, fontSize: '0.7rem' }}
            >
              {t("Release Control System")}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* User identity card                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Box
        sx={{
          mx: 2,
          mb: 2.5,
          p: 2,
          borderRadius: '14px',
          bgcolor: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: '#fff', fontSize: '0.875rem' }}
          >
            {user?.username ?? 'User'}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}
          >
            {user?.email ?? ''}
          </Typography>
        </Box>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Section label                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Typography
        variant="caption"
        sx={{
          px: 3.5,
          pb: 1,
          color: 'rgba(255,255,255,0.3)',
          fontWeight: 600,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {t("navigation")}
      </Typography>

      {/* ------------------------------------------------------------------ */}
      {/* Nav list                                                            */}
      {/* ------------------------------------------------------------------ */}
      <List sx={{ flex: 1, px: 2, py: 0 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <Box key={item.path}>
              {/* Optional section divider label */}
              {item.section && (
                <Typography
                  variant="caption"
                  sx={{
                    display:       'block',
                    px:            2,
                    pt:            2,
                    pb:            0.75,
                    color:         'rgba(255,255,255,0.3)',
                    fontWeight:    600,
                    fontSize:      '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {t(item.section)}
                </Typography>
              )}
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={item.label} placement="right" arrow
                  disableHoverListener
                  disableFocusListener
                  disableTouchListener
                >
                  <ListItemButton
                    onClick={() => handleNav(item.path)}
                    sx={{
                      borderRadius: '10px',
                      px: 2,
                      py: 1.25,
                      position: 'relative',
                      backgroundColor: isActive ? '#6366f1' : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive
                          ? '#4f46e5'
                          : 'rgba(255,255,255,0.09)',
                        transform: isActive ? 'none' : 'translateX(2px)',
                      },
                      '&::before': isActive ? {
                        content: '""',
                        position: 'absolute',
                        left: -6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 20,
                        borderRadius: 99,
                        bgcolor: '#a5b4fc',
                      } : {},
                      '& .MuiListItemIcon-root': {
                        color:    isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                        minWidth: 40,
                        transition: 'color 0.2s',
                      },
                      transition: 'background-color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease',
                      boxShadow: isActive ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
                    }}
                  >
                    <ListItemIcon sx={{ '& svg': { fontSize: 20 } }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.label)}
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: '0.9375rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                          },
                          noWrap: true,
                        },
                      }}
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            </Box>
          )
        })}
      </List>

      {/* ------------------------------------------------------------------ */}
      {/* Logout — pinned bottom                                             */}
      {/* ------------------------------------------------------------------ */}
      <Box sx={{ px: 2, pb: 3, pt: 1 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: '10px',
            px: 2,
            py: 1.25,
            color: '#f87171',
            transition: 'all 0.18s ease',
            '&:hover': { 
              bgcolor: 'rgba(239,68,68,0.14)',
              transform: 'translateX(2px)',
            },
            '& .MuiListItemIcon-root': { color: '#f87171', minWidth: 40 },
          }}
        >
          <ListItemIcon sx={{ '& svg': { fontSize: 20 } }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary={t("logout")}
            slotProps={{
              primary: {
                sx: {
                  fontSize: '0.9375rem', fontWeight: 500,
                },
              },
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  )
}

function Sidebar({ mobileOpen, onClose }) {
  const drawerSx = {
    '& .MuiDrawer-paper': {
      width: SIDEBAR_WIDTH,
      boxSizing: 'border-box',
      border: 'none',
      boxShadow: '4px 0 24px rgba(0,0,0,0.12)',

      height: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
    },
  }

  return (
    <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile — temporary slide-in */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}
      >
        <SidebarContent onClose={onClose} />
      </Drawer>

      {/* Desktop — always visible */}
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}
      >
        <SidebarContent onClose={onClose} />
      </Drawer>
    </Box>
  )
}

export default Sidebar
