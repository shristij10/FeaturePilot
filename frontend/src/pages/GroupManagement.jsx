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
  IconButton,
  Skeleton,
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
import GroupsIcon from '@mui/icons-material/GroupsRounded'
import { createGroup, fetchGroups, deleteGroup, } from '../services/groupService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Validates the group_name field used in the Create dialog.
function validateForm({ group_name }) {
  const errors = {}
  if (!group_name.trim()) {
    errors.group_name = 'Group name is required.'
  } else if (group_name.trim().length > 100) {
    errors.group_name = 'Group name must be 100 characters or fewer.'
  }
  return errors
}

const EMPTY_FORM = { group_name: '' }

// ---------------------------------------------------------------------------
// CreateGroupDialog
// ---------------------------------------------------------------------------
// Props:
//   open        — controls visibility
//   onClose     — closes the dialog
//   onSubmit    — called with { group_name } on valid submit
//   loading     — disables inputs and shows spinner while API call is in-flight
// ---------------------------------------------------------------------------
function CreateGroupDialog({ open, onClose, onSubmit, loading }) {
  const { t } = useTranslation()
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setErrors({})
    }
  }, [open])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    onSubmit({ group_name: form.group_name.trim() })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Create Group")}</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 2, px: 3, pb: 1 }}>
          <TextField
            fullWidth
            id="create-group-name"
            label={t("Group Name")}
            name="group_name"
            value={form.group_name}
            onChange={handleChange}
            error={Boolean(errors.group_name)}
            helperText={errors.group_name ? t(errors.group_name) : t('E.g. beta_testers, internal_team')}
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
            {t("Create")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------
// Props:
//   open    — controls visibility
//   onClose — cancel handler
//   onConfirm — confirm handler (triggers the DELETE)
//   group   — the row object being deleted
//   loading — disables buttons while the DELETE is in-flight
// ---------------------------------------------------------------------------
function DeleteConfirmDialog({ open, onClose, onConfirm, group, loading }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Delete Group")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("Are you sure you want to delete this group? This action cannot be undone.")}
        </DialogContentText>
        <DialogContentText sx={{ mt: 1.5, fontSize: '0.8125rem', color: 'warning.main' }}>
          {t("Groups containing members cannot be deleted. Remove all members first.")}
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
          {t("Delete")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// GroupManagement Page
// ---------------------------------------------------------------------------
function GroupManagement() {
  const { t } = useTranslation()
  // ---- data state ----
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  // ---- dialog visibility ----
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // The row currently targeted by the Delete dialog
  const [selected, setSelected] = useState(null)

  // ---- per-dialog submission spinner ----
  const [submitting, setSubmitting] = useState(false)

  // ---- toast ----
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  // ---------------------------------------------------------------------------
  // Load all groups on mount
  // ---------------------------------------------------------------------------
  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchGroups()  // GET /groups/
      setRows(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

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
  // Create — POST /groups/
  // ---------------------------------------------------------------------------
  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const created = await createGroup(payload)
      setRows(prev => [...prev, created])
      setCreateOpen(false)
      showToast(t('Group "{{name}}" created successfully.', { name: created.group_name }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete — DELETE /groups/{id}
  // The backend does not yet expose a dedicated delete-group endpoint in the
  // current router implementation, so we call it directly via the api instance.
  // This mirrors the pattern used in other service files for consistency.
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    setSubmitting(true)
    try {
      await deleteGroup(selected.id)
      setRows(prev => prev.filter(r => r.id !== selected.id))
      setDeleteOpen(false)
      showToast(t('Group "{{name}}" deleted.', { name: selected.group_name }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function openDelete(row) {
    setSelected(row)
    setDeleteOpen(true)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box>
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            {t("Group Management")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            {t("Create and manage user groups for feature flag targeting.")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {t("New Group")}
        </Button>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>

          {/* Loading state */}
          {loading ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'background.default', borderBottom: '2px solid', borderColor: 'divider' }}>
                {[50, 200, 80].map((w, i) => <Skeleton key={i} variant="text" width={w} height={18} />)}
              </Box>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  {[50, 200, 80].map((w, j) => <Skeleton key={j} variant="text" width={w} height={16} />)}
                </Box>
              ))}
            </Box>

          ) : rows.length === 0 ? (
            /* Empty state */
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t("No groups yet.")}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
                {t("Create a group to start targeting feature flags by user segment.")}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                {t("Create your first group")}
              </Button>
            </Box>

          ) : (
            /* Data table */
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
                    <TableCell>{t("Group Name")}</TableCell>
                    <TableCell align="right">{t("Actions")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        cursor:     'default',
                        transition: 'background-color 0.2s ease',
                        '&:last-child td': { border: 0 },
                        '&:hover': {
                          backgroundColor: 'rgba(99,102,241,0.04)',
                        },
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary', width: 60 }}>
                        {row.id}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.group_name}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title={t("Delete")} arrow>
                          <IconButton
                            size="small"
                            onClick={() => openDelete(row)}
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
      {/* Create Dialog                                                      */}
      {/* ------------------------------------------------------------------ */}
      <CreateGroupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirmation Dialog                                         */}
      {/* ------------------------------------------------------------------ */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        group={selected}
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

export default GroupManagement
