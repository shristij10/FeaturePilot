import { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ManageAccountsIcon from '@mui/icons-material/ManageAccountsRounded'
import {
  fetchGroups,
  fetchGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
} from '../services/groupService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// AddUserDialog
// ---------------------------------------------------------------------------
// Props:
//   open        — controls visibility
//   onClose     — closes the dialog
//   onSubmit    — called with { username } on valid submit
//   loading     — disables inputs and shows spinner while API call is in-flight
// ---------------------------------------------------------------------------
function AddUserDialog({ open, onClose, onSubmit, loading }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [error,    setError]    = useState('')

  // Reset whenever dialog opens
  useEffect(() => {
    if (open) {
      setUsername('')
      setError('')
    }
  }, [open])

  function handleChange(e) {
    setUsername(e.target.value)
    if (error) setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim()) {
      setError('Username is required.')
      return
    }
    if (username.trim().length > 100) {
      setError('Username must be 100 characters or fewer.')
      return
    }
    onSubmit({ username: username.trim() })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Add User to Group")}</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 2, px: 3, pb: 1 }}>
          <TextField
            fullWidth
            id="add-user-username"
            label={t("Username")}
            name="username"
            value={username}
            onChange={handleChange}
            error={Boolean(error)}
            helperText={error ? t(error) : t("Enter the exact username of the user to add.")}
            margin="normal"
            disabled={loading}
            autoFocus
            slotProps={{
              htmlInput: { maxLength: 100 },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} color="inherit" />}
          >
            {t("Add User")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// RemoveConfirmDialog
// ---------------------------------------------------------------------------
// Props:
//   open    — controls visibility
//   onClose — cancel handler
//   onConfirm — confirm handler
//   member  — the user row being removed
//   loading — disables buttons while the DELETE is in-flight
// ---------------------------------------------------------------------------
function RemoveConfirmDialog({ open, onClose, onConfirm, member, loading }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Remove User")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("Are you sure you want to remove {{username}} from this group? The user account will not be deleted.", { username: member?.username })}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          {t("Cancel")}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} color="inherit" />}
        >
          {t("Remove")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// GroupMembers Page
// ---------------------------------------------------------------------------
function GroupMembers() {
  const { t } = useTranslation()
  // ---- groups for the selector ----
  const [groups,         setGroups]         = useState([])
  const [groupsLoading,  setGroupsLoading]  = useState(true)

  // ---- currently selected group ----
  const [selectedGroupId, setSelectedGroupId] = useState('')

  // ---- members table ----
  const [members,         setMembers]         = useState([])
  const [membersLoading,  setMembersLoading]  = useState(false)

  // ---- dialog visibility ----
  const [addOpen,    setAddOpen]    = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  // The member currently targeted by the Remove dialog
  const [selectedMember, setSelectedMember] = useState(null)

  // ---- per-dialog submission spinner ----
  const [submitting, setSubmitting] = useState(false)

  // ---- toast ----
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  // ---------------------------------------------------------------------------
  // Load all groups on mount — used to populate the group selector
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadGroups() {
      setGroupsLoading(true)
      try {
        const data = await fetchGroups()
        setGroups(data)
      } catch (err) {
        showToast(err.message, 'error')
      } finally {
        setGroupsLoading(false)
      }
    }
    loadGroups()
  }, [])

  // ---------------------------------------------------------------------------
  // Load members whenever the selected group changes
  // ---------------------------------------------------------------------------
  const loadMembers = useCallback(async (groupId) => {
    if (!groupId) { setMembers([]); return }
    setMembersLoading(true)
    try {
      const data = await fetchGroupMembers(groupId)
      setMembers(data)
    } catch (err) {
      showToast(err.message, 'error')
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMembers(selectedGroupId)
  }, [selectedGroupId, loadMembers])

  // ---------------------------------------------------------------------------
  // Toast helpers
  // ---------------------------------------------------------------------------
  function showToast(message, severity = 'success') {
    setToast({ open: true, message, severity })
  }
  function closeToast() {
    setToast(prev => ({ ...prev, open: false }))
  }

  // ---------------------------------------------------------------------------
  // Add user — POST /groups/{id}/users
  // ---------------------------------------------------------------------------
  async function handleAdd(payload) {
    setSubmitting(true)
    try {
      const added = await addUserToGroup(selectedGroupId, payload)
      // Append new member only if not already in the list (no-op guard)
      setMembers(prev =>
        prev.some(m => m.id === added.id)
          ? prev.map(m => m.id === added.id ? added : m)
          : [...prev, added]
      )
      setAddOpen(false)
      showToast(t('User "{{username}}" added to the group.', { username: added.username }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Remove user — DELETE /groups/{groupId}/users/{userId}
  // ---------------------------------------------------------------------------
  async function handleRemove() {
    setSubmitting(true)
    try {
      await removeUserFromGroup(selectedGroupId, selectedMember.id)
      setMembers(prev => prev.filter(m => m.id !== selectedMember.id))
      setRemoveOpen(false)
      showToast(t('User "{{username}}" removed from the group.', { username: selectedMember.username }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function openRemove(member) {
    setSelectedMember(member)
    setRemoveOpen(true)
  }

  // Derived: the currently selected group object (for display)
  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box>
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          {t("Group Members")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          {t("View and manage the users belonging to each group.")}
        </Typography>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Group selector                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3, p: 2 }}>
        <FormControl fullWidth size="small" disabled={groupsLoading}>
          <InputLabel id="group-select-label">{t("Select a group")}</InputLabel>
          <Select
            labelId="group-select-label"
            value={selectedGroupId}
            label={t("Select a group")}
            onChange={e => setSelectedGroupId(e.target.value)}
          >
            {groups.map(g => (
              <MenuItem key={g.id} value={g.id}>
                {g.group_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Members table card                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>

        {/* Card header — title + Add User button */}
        <Box
          sx={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            px:             3,
            py:             2,
            borderBottom:   '1px solid',
            borderColor:    'divider',
            bgcolor:        'background.default',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            {selectedGroup
              ? t('Members of "{{group}}"', { group: selectedGroup.group_name })
              : t('Members')
            }
          </Typography>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            disabled={!selectedGroupId}
            onClick={() => setAddOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {t("Add User")}
          </Button>
        </Box>

        <CardContent sx={{ p: 0 }}>

          {/* No group selected */}
          {!selectedGroupId ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <ManageAccountsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t("Select a group above to see its members.")}
              </Typography>
            </Box>

          ) : membersLoading ? (
            /* Loading state */
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>

          ) : members.length === 0 ? (
            /* Empty state */
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <ManageAccountsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t("No members in this group yet.")}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
                {t("Add users to this group to enable group-based flag targeting.")}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                {t("Add the first user")}
              </Button>
            </Box>

          ) : (
            /* Members table */
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        fontWeight:    700,
                        bgcolor:       'background.default',
                        color:         'text.secondary',
                        fontSize:      '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom:  '2px solid',
                        borderColor:   'divider',
                      },
                    }}
                  >
                    <TableCell>{t("ID")}</TableCell>
                    <TableCell>{t("Username")}</TableCell>
                    <TableCell>{t("Email")}</TableCell>
                    <TableCell align="right">{t("Actions")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {members.map(member => (
                    <TableRow
                      key={member.id}
                      hover
                      sx={{
                        cursor:     'default',
                        transition: 'background-color 0.2s ease',
                        '&:last-child td': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(99,102,241,0.04)' },
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary', width: 60 }}>
                        {member.id}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {member.username}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ color: 'text.secondary' }}>
                        {member.email}
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title={t("Remove User")} arrow>
                          <IconButton
                            size="small"
                            onClick={() => openRemove(member)}
                            sx={{
                              color:      'error.main',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor:   'error.light',
                                transform: 'scale(1.05)',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Add User Dialog                                                    */}
      {/* ------------------------------------------------------------------ */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        loading={submitting}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Remove Confirmation Dialog                                         */}
      {/* ------------------------------------------------------------------ */}
      <RemoveConfirmDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={handleRemove}
        member={selectedMember}
        loading={submitting}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Toast                                                              */}
      {/* ------------------------------------------------------------------ */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default GroupMembers
