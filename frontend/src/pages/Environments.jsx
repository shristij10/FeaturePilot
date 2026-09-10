import { useState, useEffect, useCallback } from 'react'
import {
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
  Alert,
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
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import CloudRoundedIcon from '@mui/icons-material/CloudRounded'
import {
  fetchEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '../services/environmentService'
import { useTranslation } from 'react-i18next'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function validateForm({ name, description }) {
  const errors = {}
  if (!name.trim()) {
    errors.name = 'Name is required.'
  } else if (name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer.'
  }
  if (description && description.length > 255) {
    errors.description = 'Description must be 255 characters or fewer.'
  }
  return errors
}

const EMPTY_FORM = { name: '', description: '' }

function EnvironmentFormDialog({ open, onClose, onSubmit, initial, title, submitLabel, loading }) {
  const { t } = useTranslation()
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm({ name: initial?.name ?? '', description: initial?.description ?? '' })
      setErrors({})
    }
  }, [open, initial])

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
    onSubmit({ name: form.name.trim(), description: form.description.trim() || null })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t(title)}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 2, px: 3, pb: 1 }}>
          <TextField
            fullWidth
            id="env-name"
            label={t("Environment Name")}
            name="name"
            value={form.name}
            onChange={handleChange}
            error={Boolean(errors.name)}
            helperText={errors.name ? t(errors.name) : t("E.g. Development, Staging, Production")}
            margin="normal"
            disabled={loading}
            autoFocus
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            fullWidth
            id="env-description"
            label={t("Description")}
            name="description"
            value={form.description}
            onChange={handleChange}
            error={Boolean(errors.description)}
            helperText={errors.description ? t(errors.description) : t("Optional — describe this environment's purpose.")}
            margin="normal"
            disabled={loading}
            multiline
            rows={3}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">{t("Cancel")}</Button>
          <Button type="submit" variant="contained" disabled={loading}
            startIcon={loading && <CircularProgress size={16} color="inherit" />}>
            {t(submitLabel)}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

function DeleteConfirmDialog({ open, onClose, onConfirm, environment, loading }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Delete Environment")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("Are you sure you want to delete this environment? This action cannot be undone and will also remove all associated environment overrides.")}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">{t("Cancel")}</Button>
        <Button onClick={onConfirm} variant="contained" color="error" disabled={loading}
          startIcon={loading && <CircularProgress size={16} color="inherit" />}>
          {t("Delete")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Environments() {
  const { t } = useTranslation()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  const loadEnvironments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEnvironments()
      setRows(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEnvironments() }, [loadEnvironments])

  function showToast(message, severity = 'success') {
    setToast({ open: true, message, severity })
  }
  function closeToast() {
    setToast(prev => ({ ...prev, open: false }))
  }

  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const created = await createEnvironment(payload)
      setRows(prev => [...prev, created])
      setCreateOpen(false)
      showToast(t('Environment "{{name}}" created successfully.', { name: created.name }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(payload) {
    setSubmitting(true)
    try {
      const updated = await updateEnvironment(selected.id, payload)
      setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
      setEditOpen(false)
      showToast(t('Environment "{{name}}" updated successfully.', { name: updated.name }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    try {
      await deleteEnvironment(selected.id)
      setRows(prev => prev.filter(r => r.id !== selected.id))
      setDeleteOpen(false)
      showToast(t('Environment "{{name}}" deleted.', { name: selected.name }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(row) { setSelected(row); setEditOpen(true) }
  function openDelete(row) { setSelected(row); setDeleteOpen(true) }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>{t("Environments")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            {t("Manage deployment environments for your feature flags.")}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>
          {t("New Environment")}
        </Button>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider' }}>
                {[50, 120, 240, 100, 80].map((w, i) => <Skeleton key={i} variant="text" width={w} height={18} />)}
              </Box>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  {[50, 120, 240, 100, 80].map((w, j) => <Skeleton key={j} variant="text" width={w} height={16} />)}
                </Box>
              ))}
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <CloudRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>{t("No environments yet.")}</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ mt: 1, borderRadius: 2 }}>
                {t("Create your first environment")}
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.paper', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid', borderColor: 'divider' } }}>
                    <TableCell>{t("ID")}</TableCell>
                    <TableCell>{t("Name")}</TableCell>
                    <TableCell>{t("Description")}</TableCell>
                    <TableCell>{t("Created")}</TableCell>
                    <TableCell align="right">{t("Actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer', transition: 'background-color 0.2s ease', '&:last-child td': { border: 0 }, '&:hover': { backgroundColor: 'rgba(99,102,241,0.04)' } }}>
                      <TableCell sx={{ color: 'text.secondary', width: 60 }}>{row.id}</TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600}>{row.name}</Typography></TableCell>
                      <TableCell sx={{ color: 'text.secondary', maxWidth: 320 }}>
                        <Tooltip title={row.description ?? ''} arrow placement="top-start">
                          <Typography variant="body2" noWrap>{row.description ?? <em>{t("No description")}</em>}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t("Edit")} arrow>
                          <IconButton size="small" onClick={() => openEdit(row)} color="primary" sx={{ transition: 'all 0.2s ease', '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.05)' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("Delete")} arrow>
                          <IconButton size="small" onClick={() => openDelete(row)} color="error" sx={{ ml: 0.5, transition: 'all 0.2s ease', '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.05)' } }}>
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

      <EnvironmentFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} initial={EMPTY_FORM} title="Create Environment" submitLabel="Create" loading={submitting} />
      <EnvironmentFormDialog open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} initial={selected} title="Edit Environment" submitLabel="Save Changes" loading={submitting} />
      <DeleteConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} environment={selected} loading={submitting} />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  )
}

export default Environments
