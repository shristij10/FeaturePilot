import { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'

import { fetchOverrides, createOverride, replaceOverride, deleteOverride } from '../services/environmentOverrideService'
import { fetchFeatureFlags }  from '../services/featureFlagService'
import { fetchEnvironments }  from '../services/environmentService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Build an id → label lookup map from an array of { id, ... } objects.
// flagMap:  id → key   (e.g. { 1: 'dark_mode' })
// envMap:   id → name  (e.g. { 2: 'Production' })
function buildMap(arr, labelKey) {
  return arr.reduce((acc, item) => {
    acc[item.id] = item[labelKey]
    return acc
  }, {})
}

const EMPTY_FORM = { flag_id: '', environment_id: '', value: true }

// ---------------------------------------------------------------------------
// OverrideFormDialog — shared by Create and Edit
// ---------------------------------------------------------------------------
// Props:
//   open, onClose, onSubmit, initial, title, submitLabel, loading
//   flags        — array of FeatureFlagResponse used to populate the flag Select
//   environments — array of EnvironmentResponse used to populate the env Select
// ---------------------------------------------------------------------------
function OverrideFormDialog({
  open, onClose, onSubmit, initial, title, submitLabel, loading,
  flags, environments,
}) {
  const { t } = useTranslation()
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Re-populate form whenever dialog opens with a different initial value
  useEffect(() => {
    if (open) {
      setForm({
        flag_id:        initial?.flag_id        ?? '',
        environment_id: initial?.environment_id ?? '',
        value:          initial?.value          ?? true,
      })
      setErrors({})
    }
  }, [open, initial])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.flag_id)        errs.flag_id        = 'Please select a feature flag.'
    if (!form.environment_id) errs.environment_id = 'Please select an environment.'
    // value is a Select with explicit true/false options — always set
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      flag_id:        Number(form.flag_id),
      environment_id: Number(form.environment_id),
      // Select emits the string "true"/"false" — cast back to boolean
      value:          form.value === true || form.value === 'true',
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t(title)}</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* Feature Flag dropdown — populated from the fetched flags list */}
          <FormControl fullWidth margin="normal" error={Boolean(errors.flag_id)} disabled={loading}>
            <InputLabel id="flag-label">{t("Feature Flag")}</InputLabel>
            <Select
              labelId="flag-label"
              id="override-flag-id"
              name="flag_id"
              value={form.flag_id}
              label={t("Feature Flag")}
              onChange={handleChange}
            >
              {flags.map(f => (
                <MenuItem key={f.id} value={f.id}>
                  {/* Show key in monospace with optional description beside it */}
                  <Box>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {f.key}
                    </Typography>
                    {f.description && (
                      <Typography variant="caption" color="text.secondary">
                        {f.description}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.flag_id && <FormHelperText>{t(errors.flag_id)}</FormHelperText>}
          </FormControl>

          {/* Environment dropdown — populated from the fetched environments list */}
          <FormControl fullWidth margin="normal" error={Boolean(errors.environment_id)} disabled={loading}>
            <InputLabel id="env-label">{t("Environment")}</InputLabel>
            <Select
              labelId="env-label"
              id="override-environment-id"
              name="environment_id"
              value={form.environment_id}
              label={t("Environment")}
              onChange={handleChange}
            >
              {environments.map(e => (
                <MenuItem key={e.id} value={e.id}>
                  {e.name}
                </MenuItem>
              ))}
            </Select>
            {errors.environment_id && <FormHelperText>{t(errors.environment_id)}</FormHelperText>}
          </FormControl>

          {/* Override Value — two explicit options instead of a checkbox so
              the intent is always crystal-clear in the form */}
          <FormControl fullWidth margin="normal" disabled={loading}>
            <InputLabel id="value-label">{t("Override Value")}</InputLabel>
            <Select
              labelId="value-label"
              id="override-value"
              name="value"
              value={form.value}
              label={t("Override Value")}
              onChange={handleChange}
            >
              <MenuItem value={true}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  {t("Enabled")} (true)
                </Box>
              </MenuItem>
              <MenuItem value={false}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                  {t("Disabled")} (false)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">{t("Cancel")}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} color="inherit" />}
          >
            {t(submitLabel)}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------
function DeleteConfirmDialog({ open, onClose, onConfirm, override, flagMap, envMap, loading }) {
  const { t } = useTranslation()
  const flagLabel = override ? (flagMap[override.flag_id] ?? `Flag #${override.flag_id}`) : ''
  const envLabel  = override ? (envMap[override.environment_id] ?? `Env #${override.environment_id}`) : ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Delete Override")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("Are you sure you want to delete this override? This cannot be undone.")}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">{t("Cancel")}</Button>
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
// EnvironmentOverrides Page
// ---------------------------------------------------------------------------
function EnvironmentOverrides() {
  const { t } = useTranslation()
  // ---- reference data (flags + environments for dropdowns and display) ----
  const [flags,        setFlags]        = useState([])
  const [environments, setEnvironments] = useState([])

  // Lookup maps built once after reference data loads — used in the table and
  // delete confirmation instead of a nested find() on every render.
  // flagMap: { [id]: key }   envMap: { [id]: name }
  const [flagMap, setFlagMap] = useState({})
  const [envMap,  setEnvMap]  = useState({})

  // ---- override rows ----
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)   // initial page load

  // ---- dialogs ----
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected,   setSelected]   = useState(null)

  // ---- per-dialog submit spinner ----
  const [submitting, setSubmitting] = useState(false)

  // ---- toast ----
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  // ---------------------------------------------------------------------------
  // Load everything in parallel on mount.
  // Overrides need flag+env reference data to display meaningful labels, so
  // all three requests fire simultaneously with Promise.all.
  // ---------------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [overrides, flagList, envList] = await Promise.all([
        fetchOverrides(),
        fetchFeatureFlags(),
        fetchEnvironments(),
      ])

      setRows(overrides)
      setFlags(flagList)
      setEnvironments(envList)

      // Pre-build lookup maps so the table and delete dialog don't need to
      // call .find() on every render.
      setFlagMap(buildMap(flagList, 'key'))
      setEnvMap(buildMap(envList,  'name'))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

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
  // Create — POST /environment-overrides/
  // payload: { flag_id, environment_id, value }
  // On success the returned object is appended to local state.
  // ---------------------------------------------------------------------------
  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const created = await createOverride(payload)
      setRows(prev => [...prev, created])
      setCreateOpen(false)
      const key = flagMap[created.flag_id] ?? `Flag #${created.flag_id}`
      const env = envMap[created.environment_id]  ?? `Env #${created.environment_id}`
      showToast(t('Override for "{{key}}" in "{{env}}" created.', { key, env }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Edit — PUT /environment-overrides/{id}
  // Uses PUT (not PATCH) because the backend's PATCH only accepts `value` —
  // to change flag_id or environment_id the full resource must be replaced.
  // On success the stale row is replaced in-place.
  // ---------------------------------------------------------------------------
  async function handleEdit(payload) {
    setSubmitting(true)
    try {
      const updated = await replaceOverride(selected.id, payload)
      setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
      setEditOpen(false)
      const key = flagMap[updated.flag_id] ?? `Flag #${updated.flag_id}`
      const env = envMap[updated.environment_id]  ?? `Env #${updated.environment_id}`
      showToast(t('Override for "{{key}}" in "{{env}}" updated.', { key, env }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete — DELETE /environment-overrides/{id}
  // Filters the deleted row out of local state immediately.
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    setSubmitting(true)
    try {
      await deleteOverride(selected.id)
      setRows(prev => prev.filter(r => r.id !== selected.id))
      setDeleteOpen(false)
      const key = flagMap[selected.flag_id] ?? `Flag #${selected.flag_id}`
      const env = envMap[selected.environment_id]  ?? `Env #${selected.environment_id}`
      showToast(t('Override for "{{key}}" in "{{env}}" deleted.', { key, env }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(row)   { setSelected(row); setEditOpen(true)   }
  function openDelete(row) { setSelected(row); setDeleteOpen(true) }

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
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>{t("Environment Overrides")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            {t("Override feature flag values for specific environments.")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ borderRadius: 2, fontWeight: 600 }}
          disabled={loading}
        >
          {t("New Override")}
        </Button>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>

          {loading ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider' }}>
                {[50, 160, 140, 90, 80].map((w, i) => <Skeleton key={i} variant="text" width={w} height={18} />)}
              </Box>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  {[50, 160, 140, 90, 80].map((w, j) => <Skeleton key={j} variant="text" width={w} height={16} />)}
                </Box>
              ))}
            </Box>

          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <TuneRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t("No overrides yet.")}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
                {t("Override feature flag values for specific environments.")}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ mt: 1, borderRadius: 2 }}
              >
                {t("Create your first override")}
              </Button>
            </Box>

          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 580 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.paper', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid', borderColor: 'divider', whiteSpace: 'nowrap' } }}>
                    <TableCell>{t("ID")}</TableCell>
                    <TableCell>{t("Feature Flag")}</TableCell>
                    <TableCell>{t("Environment")}</TableCell>
                    <TableCell>{t("Override Value")}</TableCell>
                    <TableCell align="right">{t("Actions")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>

                      {/* ID */}
                      <TableCell sx={{ color: 'text.secondary', width: 60 }}>
                        {row.id}
                      </TableCell>

                      {/* Feature Flag — look up key from flagMap, fall back to raw ID */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontFamily: 'monospace', fontSize: 13 }}
                        >
                          {flagMap[row.flag_id] ?? `Flag #${row.flag_id}`}
                        </Typography>
                      </TableCell>

                      {/* Environment — look up name from envMap, fall back to raw ID */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {envMap[row.environment_id] ?? `Env #${row.environment_id}`}
                        </Typography>
                      </TableCell>

                      {/* Override Value — green Enabled / grey Disabled Chip */}
                      <TableCell>
                        <Chip
                          label={row.value ? t('Enabled') : t('Disabled')}
                          color={row.value ? 'success' : 'default'}
                          size="small"
                          variant={row.value ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 600, fontSize: 12 }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Tooltip title={t("Edit")}>
                          <IconButton size="small" onClick={() => openEdit(row)} color="primary" aria-label={t("Edit")}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("Delete")}>
                          <IconButton size="small" onClick={() => openDelete(row)} color="error" aria-label={t("Delete")}>
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
      {/* Dialogs                                                            */}
      {/* ------------------------------------------------------------------ */}
      <OverrideFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        initial={EMPTY_FORM}
        title="Create Override"
        submitLabel="Create"
        loading={submitting}
        flags={flags}
        environments={environments}
      />

      <OverrideFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={selected}
        title="Edit Override"
        submitLabel="Save Changes"
        loading={submitting}
        flags={flags}
        environments={environments}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        override={selected}
        flagMap={flagMap}
        envMap={envMap}
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

export default EnvironmentOverrides
