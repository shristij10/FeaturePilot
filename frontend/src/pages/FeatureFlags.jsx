import { useState, useEffect, useCallback } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  FormControl, FormControlLabel, FormHelperText, IconButton, InputLabel,
  MenuItem, Select, Skeleton, Slider, Snackbar, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon    from '@mui/icons-material/Add'
import EditIcon   from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import {
  fetchFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag,
} from '../services/featureFlagService'
import { useTranslation } from 'react-i18next'

const FLAG_TYPES = ['boolean', 'string', 'number', 'json']
const TYPE_COLORS = { boolean: 'primary', string: 'success', number: 'warning', json: 'secondary' }
const EMPTY_FORM = { key: '', description: '', type: 'boolean', default_value: 'false', enabled: true, owner_team: '', rollout_percentage: 100 }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function validateForm(f) {
  const errors = {}
  if (!f.key.trim()) { errors.key = 'Key is required.' }
  else if (f.key.length > 100) { errors.key = 'Key must be 100 characters or fewer.' }
  else if (!/^[a-z0-9_]+$/.test(f.key)) { errors.key = 'Only lowercase letters, numbers, and underscores are allowed.' }
  if (!FLAG_TYPES.includes(f.type)) { errors.type = 'Please select a valid type.' }
  if (!f.default_value.trim()) { errors.default_value = 'Default value is required.' }
  else if (f.default_value.length > 100) { errors.default_value = 'Default value must be 100 characters or fewer.' }
  if (f.owner_team && f.owner_team.length > 100) { errors.owner_team = 'Owner team must be 100 characters or fewer.' }
  const rp = Number(f.rollout_percentage)
  if (!Number.isInteger(rp) || rp < 0 || rp > 100) { errors.rollout_percentage = 'Rollout percentage must be a whole number between 0 and 100.' }
  return errors
}

function FlagFormDialog({ open, onClose, onSubmit, initial, title, submitLabel, loading }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm({
        key: initial?.key ?? '', description: initial?.description ?? '',
        type: initial?.type ?? 'boolean', default_value: initial?.default_value ?? 'false',
        enabled: initial?.enabled ?? true, owner_team: initial?.owner_team ?? '',
        rollout_percentage: initial?.rollout_percentage ?? 100,
      })
      setErrors({})
    }
  }, [open, initial])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }
  function handleSwitch(e) { setForm(prev => ({ ...prev, enabled: e.target.checked })) }
  function handleSliderChange(_e, newValue) {
    setForm(prev => ({ ...prev, rollout_percentage: newValue }))
    if (errors.rollout_percentage) setErrors(prev => ({ ...prev, rollout_percentage: '' }))
  }
  function handleRolloutInputChange(e) {
    const raw = e.target.value
    const numeric = raw === '' ? '' : Math.min(100, Math.max(0, Number(raw)))
    setForm(prev => ({ ...prev, rollout_percentage: raw === '' ? '' : numeric }))
    if (errors.rollout_percentage) setErrors(prev => ({ ...prev, rollout_percentage: '' }))
  }
  function handleRolloutInputBlur() {
    const clamped = Math.min(100, Math.max(0, parseInt(form.rollout_percentage, 10) || 0))
    setForm(prev => ({ ...prev, rollout_percentage: clamped }))
  }
  function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return }
    onSubmit({
      key: form.key.trim(), description: form.description.trim() || null,
      type: form.type, default_value: form.default_value.trim(),
      enabled: form.enabled, owner_team: form.owner_team.trim() || null,
      rollout_percentage: Number(form.rollout_percentage),
    })
  }
  const sliderValue = Number.isFinite(Number(form.rollout_percentage))
    ? Math.min(100, Math.max(0, Number(form.rollout_percentage))) : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t(title)}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          <TextField fullWidth id="flag-key" label={t("Flag Key")} name="key" value={form.key} onChange={handleChange}
            error={Boolean(errors.key)} helperText={errors.key ? t(errors.key) : t('Lowercase letters, numbers, underscores (e.g. dark_mode)')}
            margin="normal" autoFocus disabled={loading} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField fullWidth id="flag-description" label={t("Description")} name="description" value={form.description} onChange={handleChange}
            error={Boolean(errors.description)} helperText={errors.description || t('Optional — describe what this flag controls.')}
            margin="normal" disabled={loading} multiline rows={2} />
          <FormControl fullWidth margin="normal" error={Boolean(errors.type)} disabled={loading}>
            <InputLabel id="type-label">{t("Type")}</InputLabel>
            <Select labelId="type-label" id="flag-type" name="type" value={form.type} label={t("Type")} onChange={handleChange}>
              {FLAG_TYPES.map(tp => (
                <MenuItem key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</MenuItem>
              ))}
            </Select>
            {errors.type && <FormHelperText>{t(errors.type)}</FormHelperText>}
          </FormControl>
          <TextField fullWidth id="flag-default-value" label={t("Default Value")} name="default_value" value={form.default_value} onChange={handleChange}
            error={Boolean(errors.default_value)}
            helperText={errors.default_value ? t(errors.default_value) : t('Always stored as a string (e.g. "true", "42", "red")')}
            margin="normal" disabled={loading} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField fullWidth id="flag-owner-team" label={t("Owner Team")} name="owner_team" value={form.owner_team} onChange={handleChange}
            error={Boolean(errors.owner_team)} helperText={errors.owner_team ? t(errors.owner_team) : t('Optional — team responsible for this flag.')}
            margin="normal" disabled={loading} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <Box sx={{ mt: 2.5, mb: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" fontWeight={600} color="text.primary">{t("Rollout Percentage")}</Typography>
              <Typography variant="caption" sx={{
                px: 1.25, py: 0.4, fontWeight: 700, borderRadius: '8px', border: '1px solid',
                bgcolor: sliderValue === 100 ? 'success.light' : sliderValue === 0 ? 'error.light' : 'primary.light',
                color:   sliderValue === 100 ? 'success.dark'  : sliderValue === 0 ? 'error.dark'  : 'primary.dark',
                borderColor: sliderValue === 100 ? 'success.main' : sliderValue === 0 ? 'error.main' : 'primary.main',
              }}>{t("Current Rollout: {{pct}}%", { pct: sliderValue })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider value={sliderValue} onChange={handleSliderChange} min={0} max={100} step={1}
                disabled={loading} sx={{ flex: 1 }} aria-label="Rollout percentage" />
              <TextField value={form.rollout_percentage} onChange={handleRolloutInputChange}
                onBlur={handleRolloutInputBlur} error={Boolean(errors.rollout_percentage)}
                disabled={loading} type="number" size="small" sx={{ width: 80 }}
                id="flag-rollout-input"
                name="rollout_percentage_input"
                label={t("Rollout %")}
                slotProps={{ htmlInput: { min: 0, max: 100, step: 1, style: { textAlign: 'center' }, 'aria-label': t('Rollout percentage value') } }} />
            </Box>
            {errors.rollout_percentage && <FormHelperText error>{t(errors.rollout_percentage)}</FormHelperText>}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {t("Percentage of users who will see this flag as enabled (0 = no one, 100 = everyone).")}
            </Typography>
          </Box>
          <FormControlLabel sx={{ mt: 1.5 }}
            control={<Switch checked={form.enabled} onChange={handleSwitch} disabled={loading} color="primary" id="flag-enabled" name="enabled" />}
            label={form.enabled ? t('Enabled') : t('Disabled')} />
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

function DeleteConfirmDialog({ open, onClose, onConfirm, flag, loading }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Delete Feature Flag")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("Are you sure you want to delete this feature flag? This cannot be undone and will remove all associated environment overrides.")}
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

function FeatureFlags() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  const loadFlags = useCallback(async () => {
    setLoading(true)
    try { const data = await fetchFeatureFlags(); setRows(data) }
    catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadFlags() }, [loadFlags])

  function showToast(message, severity = 'success') { setToast({ open: true, message, severity }) }
  function closeToast() { setToast(prev => ({ ...prev, open: false })) }

  async function handleCreate(payload) {
    setSubmitting(true)
    try { const created = await createFeatureFlag(payload); setRows(prev => [...prev, created]); setCreateOpen(false); showToast(t('Flag "{{key}}" created successfully.', { key: created.key })) }
    catch (err) { showToast(err.message, 'error') }
    finally { setSubmitting(false) }
  }
  async function handleEdit(payload) {
    setSubmitting(true)
    try { const updated = await updateFeatureFlag(selected.id, payload); setRows(prev => prev.map(r => r.id === updated.id ? updated : r)); setEditOpen(false); showToast(t('Flag "{{key}}" updated successfully.', { key: updated.key })) }
    catch (err) { showToast(err.message, 'error') }
    finally { setSubmitting(false) }
  }
  async function handleDelete() {
    setSubmitting(true)
    try { await deleteFeatureFlag(selected.id); setRows(prev => prev.filter(r => r.id !== selected.id)); setDeleteOpen(false); showToast(t('Flag "{{key}}" deleted.', { key: selected.key })) }
    catch (err) { showToast(err.message, 'error') }
    finally { setSubmitting(false) }
  }

  function openEdit(row)   { setSelected(row); setEditOpen(true) }
  function openDelete(row) { setSelected(row); setDeleteOpen(true) }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>{t("Feature Flags")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            {t("Create and manage feature flags across your environments.")}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>
          {t("New Flag")}
        </Button>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'background.paper', borderBottom: '2px solid', borderColor: 'divider' }}>
                {[120, 160, 70, 100, 70, 80, 100, 90, 60].map((w, i) => <Skeleton key={i} variant="text" width={w} height={18} />)}
              </Box>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  {[120, 160, 70, 100, 70, 80, 100, 90, 60].map((w, j) => <Skeleton key={j} variant="text" width={w} height={16} />)}
                </Box>
              ))}
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <FlagRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>{t("No feature flags yet.")}</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ mt: 1, borderRadius: 2 }}>
                {t("Create your first flag")}
              </Button>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 780 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.paper', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid', borderColor: 'divider', whiteSpace: 'nowrap' } }}>
                    <TableCell>{t("Key")}</TableCell>
                    <TableCell>{t("Description")}</TableCell>
                    <TableCell>{t("Type")}</TableCell>
                    <TableCell>{t("Default Value")}</TableCell>
                    <TableCell>{t("Rollout %")}</TableCell>
                    <TableCell>{t("Enabled")}</TableCell>
                    <TableCell>{t("Owner Team")}</TableCell>
                    <TableCell>{t("Created")}</TableCell>
                    <TableCell align="right">{t("Actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: 13 }}>{row.key}</Typography></TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={row.description ?? ''} arrow placement="top-start">
                          <Typography variant="body2" color="text.secondary" noWrap>{row.description ?? <em>—</em>}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell><Chip label={row.type} color={TYPE_COLORS[row.type] ?? 'default'} size="small" sx={{ fontWeight: 600, fontSize: 12 }} /></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>{row.default_value}</Typography></TableCell>
                      <TableCell><Chip label={`${row.rollout_percentage ?? 0}%`} color="primary" size="small" variant="outlined" sx={{ fontWeight: 600 }} /></TableCell>
                      <TableCell>
                        <Chip label={row.enabled ? t('Enabled') : t('Disabled')} color={row.enabled ? 'success' : 'default'}
                          size="small" variant={row.enabled ? 'filled' : 'outlined'} sx={{ fontWeight: 600, fontSize: 12 }} />
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{row.owner_team ?? <em>—</em>}</Typography></TableCell>
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t("Edit")}><IconButton size="small" onClick={() => openEdit(row)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={t("Delete")}><IconButton size="small" onClick={() => openDelete(row)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <FlagFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} initial={EMPTY_FORM} title="Create Feature Flag" submitLabel="Create" loading={submitting} />
      <FlagFormDialog open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} initial={selected} title="Edit Feature Flag" submitLabel="Save Changes" loading={submitting} />
      <DeleteConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} flag={selected} loading={submitting} />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  )
}

export default FeatureFlags
