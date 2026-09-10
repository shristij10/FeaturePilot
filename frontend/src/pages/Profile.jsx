import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Avatar,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Alert,
  TextField,
} from '@mui/material'
import EmailIcon       from '@mui/icons-material/EmailOutlined'
import CalendarIcon    from '@mui/icons-material/CalendarTodayOutlined'
import RoleIcon        from '@mui/icons-material/BadgeOutlined'
import DeptIcon        from '@mui/icons-material/CorporateFareOutlined'
import UsernameIcon    from '@mui/icons-material/AccountCircleOutlined'
import EditIcon        from '@mui/icons-material/EditOutlined'
import CheckIcon       from '@mui/icons-material/CheckCircleOutlined'
import LoginIcon       from '@mui/icons-material/LoginOutlined'
import PersonIcon      from '@mui/icons-material/PersonOutlined'
import { getStoredUser, updateStoredUser } from '../services/authService'
import { updateProfile } from '../services/userService'
import { fetchUserAuditLogs } from '../services/auditLogService'
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Design tokens — use theme palette so dark mode works
// ---------------------------------------------------------------------------
const CARD_RADIUS  = '20px'
const CARD_SHADOW  = '0 8px 24px rgba(15,23,42,0.06)'
const HOVER_SHADOW = '0 18px 36px rgba(15,23,42,0.10)'
const TRANSITION   = 'all 0.25s ease'
const MUTED        = 'text.secondary'

// ---------------------------------------------------------------------------
// Helpers — unchanged from original
// ---------------------------------------------------------------------------
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  })
}

function getInitials(username) {
  return username?.[0]?.toUpperCase() ?? '?'
}

// ---------------------------------------------------------------------------
// Activity helpers
// ---------------------------------------------------------------------------

// Maps backend action strings to user-friendly display text.
// Falls back to the original action string if no mapping exists.
const ACTION_TEXT_MAP = {
  'User Login':        'Logged in successfully',
  'User Signup':       'Account created',
  'Update Profile':    'Updated profile',
  'Update Username':   'Updated username',
  'Update profile':    'Updated profile',
  'Update username':   'Updated username',
}

function getActivityText(action) {
  return ACTION_TEXT_MAP[action] ?? action
}

// Returns the icon element and background colour for a given action.
function getActivityMeta(action) {
  const lower = action.toLowerCase()

  if (lower.includes('login')) {
    return {
      icon:  <LoginIcon    sx={{ fontSize: 18, color: 'success.main' }} />,
      bg:    'success.light',
    }
  }
  if (lower.includes('signup') || lower.includes('created')) {
    return {
      icon:  <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
      bg:    'action.hover',
    }
  }
  // Username update, profile update, and all other user-account actions
  return {
    icon:  <PersonIcon sx={{ fontSize: 18, color: 'primary.main' }} />,
    bg:    'action.selected',
  }
}

// Formats an ISO timestamp into a human-readable relative label.
// Examples: "Today, 11:25 AM" | "Yesterday, 6:40 PM" | "Jul 5, 2026"
function formatActivityTime(iso) {
  if (!iso) return '—'

  const date  = new Date(iso)
  const now   = new Date()

  // Strip time from both dates to compare calendar days
  const today     = new Date(now.getFullYear(),  now.getMonth(),  now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const entryDay  = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  if (entryDay.getTime() === today.getTime()) {
    return `Today, ${timeStr}`
  }
  if (entryDay.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeStr}`
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

// ---------------------------------------------------------------------------
// InfoRow — uniform row used in both detail cards
// ---------------------------------------------------------------------------
function InfoRow({ icon, label, value, chip = false, chipColor = 'primary', last = false }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        {/* Circular icon container */}
        <Box
          sx={{
            width:          40,
            height:         40,
            borderRadius:   '50%',
            bgcolor:        'action.selected',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          'primary.main',
            flexShrink:     0,
          }}
        >
          {icon}
        </Box>

        {/* Label + value */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize:      '0.6875rem',
              fontWeight:    600,
              color:         'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb:            0.5,
            }}
          >
            {label}
          </Typography>

          {chip ? (
            <Chip
              label={value}
              color={chipColor}
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.8125rem', borderRadius: '8px' }}
            />
          ) : (
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary', wordBreak: 'break-all' }}>
              {value}
            </Typography>
          )}
        </Box>
      </Box>
      {!last && <Divider sx={{ opacity: 0.4 }} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// ActivityRow — single item in the Recent Activity card
// ---------------------------------------------------------------------------
function ActivityRow({ icon, text, time, iconBg, last = false }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        <Box
          sx={{
            width:          36,
            height:         36,
            borderRadius:   '50%',
            bgcolor:        iconBg,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ flex: 1, fontSize: '0.9375rem', color: 'text.primary', fontWeight: 500 }}>
          {text}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {time}
        </Typography>
      </Box>
      {!last && <Divider sx={{ opacity: 0.4 }} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Department options
// ---------------------------------------------------------------------------
const DEPARTMENT_OPTIONS = [
  'Frontend',
  'Backend',
  'QA',
  'DevOps',
  'Product',
  'Not Assigned',
]

// ---------------------------------------------------------------------------
// EditProfileDialog
// ---------------------------------------------------------------------------
// Opens when the user clicks "Edit Profile" in the hero card.
// Props:
//   open       — controls dialog visibility
//   onClose    — called when the dialog should close (cancel or after save)
//   currentUsername   — pre-fills the Username field
//   currentDepartment — pre-selects the Department field
//   onSave     — called with { username, department } on successful save
// ---------------------------------------------------------------------------
function EditProfileDialog({ open, onClose, currentUsername, currentDepartment, onSave }) {
  const { t } = useTranslation()
  const [form,    setForm]    = useState({ username: '', department: '' })
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)

  // Re-populate form fields whenever the dialog opens
  // (handled by TransitionProps.onEnter — this block intentionally left empty)

  // Sync when open transitions to true
  const handleEnter = () => {
    setForm({ username: currentUsername, department: currentDepartment })
    setErrors({})
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.username.trim()) {
      errs.username = 'Username is required.'
    } else if (form.username.trim().length < 3) {
      errs.username = 'Username must contain at least 3 characters.'
    } else if (form.username.trim().length > 30) {
      errs.username = 'Username cannot exceed 30 characters.'
    }
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      // Delegate to the parent's onSave — the real API call lives there
      await onSave({ username: form.username.trim(), department: form.department })
      onClose()
    } catch {
      // onSave throws on API error — the parent handles the snackbar
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
      PaperProps={{
        sx: {
          borderRadius: '20px',
          overflow:     'hidden',
        },
      }}
    >
      {/* Dialog header */}
      <DialogTitle
        sx={{
          px:         4,
          pt:         4,
          pb:         1,
          fontWeight: 800,
          fontSize:   '1.25rem',
          lineHeight: 1.3,
        }}
      >
        {t("editProfile")}
        <Typography
          sx={{
            fontSize:   '0.9rem',
            fontWeight: 400,
            color:      'text.secondary',
            mt:         0.5,
          }}
        >
          {t("Update your personal account information.")}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pt: 3, pb: 1 }}>

        {/* Username field */}
        <TextField
          fullWidth
          id="profile-username"
          label={t("Username")}
          name="username"
          value={form.username}
          onChange={handleChange}
          error={Boolean(errors.username)}
          helperText={errors.username ? t(errors.username) : ' '}
          disabled={saving}
          autoFocus
          inputProps={{ maxLength: 30 }}
          sx={{ mb: 3 }}
        />

        {/* Department select */}
        <FormControl fullWidth disabled={saving}>
          <InputLabel id="dept-label">{t("Department")}</InputLabel>
          <Select
            labelId="dept-label"
            id="profile-department"
            name="department"
            value={form.department}
            label={t("Department")}
            onChange={handleChange}
          >
            {DEPARTMENT_OPTIONS.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>

      </DialogContent>

      <DialogActions
        sx={{
          px:  4,
          py:  3,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: '10px', px: 3, fontWeight: 600 }}
        >
          {t("Cancel")}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving && <CircularProgress size={16} color="inherit" />}
          sx={{ borderRadius: '10px', px: 3, fontWeight: 600 }}
        >
          {saving ? t("Saving\u2026") : t("Save Changes")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------
function Profile() {
  const { t } = useTranslation();
  const user = getStoredUser()

  // All variable names preserved from original
  const username   = user?.username   ?? 'Unknown User'
  const email      = user?.email      ?? '—'
  const createdAt  = formatDate(user?.created_at)
  const role       = user?.role       ?? 'User'
  const department = user?.department ?? 'Not Assigned'

  // ---- edit dialog state ----
  const [editOpen,   setEditOpen]   = useState(false)
  const [snackbar,   setSnackbar]   = useState({ open: false, message: '', severity: 'success' })

  // Local overrides — applied on top of localStorage values after a save.
  const [localUsername,   setLocalUsername]   = useState(null)
  const [localDepartment, setLocalDepartment] = useState(null)

  // Resolved display values — prefer local overrides when present
  const displayUsername   = localUsername   ?? username
  const displayDepartment = localDepartment ?? department

  // ---- recent activity state ----
  const [activities,      setActivities]      = useState([])
  const [activityLoading, setActivityLoading] = useState(true)

  // Fetch the current user's audit logs on mount and whenever the
  // displayed username changes (e.g. after a successful profile update).
  useEffect(() => {
    let cancelled = false
    async function loadActivity() {
      setActivityLoading(true)
      try {
        const logs = await fetchUserAuditLogs(displayUsername, 5)
        if (!cancelled) setActivities(logs)
      } catch {
        // Non-fatal — silently show empty state rather than crashing
        if (!cancelled) setActivities([])
      } finally {
        if (!cancelled) setActivityLoading(false)
      }
    }
    loadActivity()
    return () => { cancelled = true }
  }, [displayUsername])  // re-fetch when username changes after an update

  const lastLogin = activities.find(
    (activity) => activity.action === "User Login"
  )

  async function handleSave({ username: newUsername, department: newDepartment }) {
    try {
      // Call the real backend — sends only user_id + username (no department)
      const updatedUser = await updateProfile({
        user_id:  user?.id,
        username: newUsername,
      })

      // Update localStorage with the full backend response — so refresh,
      // logout, and re-login all show the new username.
      updateStoredUser(updatedUser)

      // Update local display state immediately (no page reload needed)
      setLocalUsername(updatedUser.username)

      // Department is UI-only — keep updating it locally as before
      setLocalDepartment(newDepartment)

      setSnackbar({ open: true, message: t('Profile updated successfully.'), severity: 'success' })
    } catch (err) {
      const msg = err.message === 'Username already exists.'
        ? t('Username already exists.')
        : t('Unable to update profile. Please try again.')
      setSnackbar({ open: true, message: msg, severity: 'error' })
      // Re-throw so the dialog's spinner stops and dialog stays open
      throw err
    }
  }

  function closeSnackbar() {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  // Shared card sx — matches Dashboard card style
  const cardSx = {
    borderRadius: CARD_RADIUS,
    border:       '1px solid',
    borderColor:  'divider',
    boxShadow:    CARD_SHADOW,
    bgcolor:      'background.paper',
    transition:   TRANSITION,
    '&:hover': {
      boxShadow: HOVER_SHADOW,
      transform: 'translateY(-2px)',
    },
  }

  return (
    <Box>

      {/* ================================================================
          PAGE HEADER — identical structure to Dashboard
          ================================================================ */}
      <Box mb={4}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ letterSpacing: '-0.02em', mb: 0.5 }}
        >
          {t("profile")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          {t("profileDescription")}
        </Typography>
      </Box>

      {/* ================================================================
          HERO CARD — full gradient, avatar left, info centre, button right
          ================================================================ */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '24px',
          background:   'linear-gradient(135deg, #667eea 0%, #6366f1 50%, #7c3aed 100%)',
          boxShadow:    '0 12px 40px rgba(99,102,241,0.35)',
          mb:           4,
          overflow:     'hidden',
          transition:   TRANSITION,
        }}
      >
        <CardContent
          sx={{
            p:          { xs: '28px', sm: '40px' },
            '&:last-child': { pb: { xs: '28px', sm: '40px' } },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'column',
                md: 'row',
              },
              alignItems: {
                xs: 'center',
                md: 'center',
              },
              textAlign: {
                xs: 'center',
                md: 'left',
              },
              gap: 3,
            }}
          >
            {/* Avatar */}
            <Avatar
              sx={{
                width:      96,
                height:     96,
                fontSize:   '2.25rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
                border:     '3px solid rgba(255,255,255,0.6)',
                boxShadow:  '0 8px 24px rgba(0,0,0,0.2)',
                color:      '#fff',
                flexShrink: 0,
              }}
            >
              {getInitials(displayUsername)}
            </Avatar>

            {/* Identity info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Username */}
              <Typography
                sx={{
                  fontSize:      { xs: '1.5rem', sm: '2rem' },
                  fontWeight:    800,
                  color:         '#fff',
                  textAlign: {
                    xs: 'center',
                    md: 'left',
                  },
                  lineHeight:    1.15,
                  letterSpacing: '-0.015em',
                  mb:            0.5,
                }}
              >
                {displayUsername}
              </Typography>

              {/* Email */}
              <Typography
                sx={{
                  fontSize:  '1rem',
                  color:     'rgba(255,255,255,0.85)',
                  mb:        1,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  textAlign: {
                      xs: 'center',
                      md: 'left',
                  },
                }}
              >
                {email}
              </Typography>

              {/* Member since */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: {
                    xs: 'center',
                    md: 'flex-start',
                  },
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <CalendarIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.65)' }} />
                <Typography sx={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)' }}>
                  {t("memberSince")} {createdAt}
                </Typography>
              </Box>
            </Box>

            {/* Edit Profile button */}
            <Button
              fullWidth={false}
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditOpen(true)}
              sx={{
                color:       '#fff',
                borderColor: 'rgba(255,255,255,0.55)',
                bgcolor:     'transparent',
                borderRadius: '12px',
                px:          2.5,
                py:          1,
                fontWeight:  600,
                fontSize:    '0.875rem',
                whiteSpace:  'nowrap',
                alignSelf: {
                      xs: 'center',
                      md: 'flex-start',
                },
                mt: {
                  xs: 2,
                  md: 0,
                },
                flexShrink:  0,
                transition:  TRANSITION,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.85)',
                  bgcolor:     'rgba(255,255,255,0.12)',
                },
              }}
            >
              {t("editProfile")}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ================================================================
          TWO DETAIL CARDS — equal width, equal height
          ================================================================ */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: '24px',
          mb: 4,
        }}
      >

        {/* --- Left: Account Information --- */}
        <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
          <CardContent sx={{ p: '32px !important' }}>

            {/* Card header */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                {t("accountInformation")}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: MUTED }}>
                {t("Manage your login and personal information.")}
              </Typography>
            </Box>
            <Divider sx={{ mb: 0.5, opacity: 0.5 }} />

            <InfoRow
              icon={<UsernameIcon fontSize="small" />}
              label={t("Username")}
              value={displayUsername}
            />
            <InfoRow
              icon={<EmailIcon fontSize="small" />}
              label={t("Email Address")}
              value={email}
            />
            <InfoRow
              icon={<CalendarIcon fontSize="small" />}
              label={t("accountCreated")}
              value={createdAt}
              last
            />
          </CardContent>
        </Card>

        {/* --- Right: Account Status --- */}
        <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
          <CardContent sx={{ p: '32px !important' }}>

            {/* Card header */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                {t("accountStatus")}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: MUTED }}>
                {t("Current permissions and account details.")}
              </Typography>
            </Box>
            <Divider sx={{ mb: 0.5, opacity: 0.5 }} />

            {/* Role */}
            <InfoRow
              icon={<RoleIcon fontSize="small" />}
              label={t("role")}
              value={role}
              chip
              chipColor="primary"
            />

            {/* Department */}
            <InfoRow
              icon={<DeptIcon fontSize="small" />}
              label={t("department")}
              value={displayDepartment}
              chip
              chipColor={displayDepartment === 'Not Assigned' ? 'default' : 'success'}
            />

            {/* Account Status — extra field, always Active */}
            <InfoRow
              icon={<CheckIcon fontSize="small" />}
              label={t("Account Status")}
              value={t("active")}
              chip
              chipColor="success"
            />

            {/* Last Login — placeholder */}
            <InfoRow
              icon={<LoginIcon fontSize="small" />}
              label={t("lastLogin")}
              value={
                lastLogin
                  ? formatActivityTime(lastLogin.timestamp)
                  : t("Never")
              }
              last
            />
          </CardContent>
        </Card>

      </Box>

      {/* ================================================================
          RECENT ACTIVITY — full width
          ================================================================ */}
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ p: '32px !important' }}>

          {/* Card header */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t("recentActivity")}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: MUTED }}>
              {t("Recent actions performed on your account.")}
            </Typography>
          </Box>
          <Divider sx={{ mb: 0.5, opacity: 0.5 }} />

          {/* Loading skeleton rows */}
          {activityLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="55%" height={18} />
                </Box>
                <Skeleton variant="text" width={80} height={14} />
              </Box>
            ))
          ) : activities.length === 0 ? (
            /* Empty state — no logs yet for this user */
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t("noRecentActivity")}
              </Typography>
            </Box>
          ) : (
            /* Real audit log rows */
            activities.map((log, idx) => {
              const { icon, bg } = getActivityMeta(log.action)
              return (
                <ActivityRow
                  key={log.id}
                  icon={icon}
                  iconBg={bg}
                  text={t(getActivityText(log.action))}
                  time={formatActivityTime(log.timestamp)}
                  last={idx === activities.length - 1}
                />
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          EDIT PROFILE DIALOG
          ================================================================ */}
      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currentUsername={displayUsername}
        currentDepartment={displayDepartment}
        onSave={handleSave}
      />

      {/* ================================================================
          SNACKBAR
          ================================================================ */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '12px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  )
}

export default Profile
