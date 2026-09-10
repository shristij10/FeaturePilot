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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import TrackChangesIcon from '@mui/icons-material/TrackChangesRounded'
import {
  createTargetingRule,
  fetchTargetingRules,
  deleteTargetingRule,
} from '../services/targetingRuleService'
import { fetchFeatureFlags } from '../services/featureFlagService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Build an id → key lookup map for feature flags.
// e.g. { 1: 'dark_mode', 2: 'beta_ui' }
function buildFlagMap(flags) {
  return flags.reduce((acc, f) => {
    acc[f.id] = f.key
    return acc
  }, {})
}

// Visual config for the two valid rule_type values.
const RULE_TYPE_CONFIG = {
  user:  { label: 'User',  color: 'primary'   },
  group: { label: 'Group', color: 'secondary' },
}

const EMPTY_FORM = { flag_id: '', rule_type: '', rule_value: '' }

// ---------------------------------------------------------------------------
// CreateRuleDialog
// ---------------------------------------------------------------------------
// Props:
//   open    — controls visibility
//   onClose — closes the dialog
//   onSubmit — called with { flag_id, rule_type, rule_value } on valid submit
//   loading — disables inputs and shows spinner while API call is in-flight
//   flags   — array of FeatureFlagResponse used to populate the flag Select
// ---------------------------------------------------------------------------
function CreateRuleDialog({ open, onClose, onSubmit, loading, flags }) {
  const { t } = useTranslation()
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Reset form whenever dialog opens
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

  function validate() {
    const errs = {}
    if (!form.flag_id)     errs.flag_id    = 'Please select a feature flag.'
    if (!form.rule_type)   errs.rule_type  = 'Please select a rule type.'
    if (!form.rule_value.trim()) {
      errs.rule_value = 'Rule value is required.'
    } else if (form.rule_value.trim().length > 255) {
      errs.rule_value = 'Rule value must be 255 characters or fewer.'
    }
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      flag_id:    Number(form.flag_id),
      rule_type:  form.rule_type,
      rule_value: form.rule_value.trim(),
    })
  }

  // Helper text describing what rule_value means based on the selected rule_type
  const ruleValueHelperText = () => {
    if (errors.rule_value) return errors.rule_value
    if (form.rule_type === 'user')  return 'Enter the exact username to target.'
    if (form.rule_type === 'group') return 'Enter the exact group name to target.'
    return 'Enter a username (user) or group name (group).'
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Create Targeting Rule")}</DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 2, px: 3, pb: 1 }}>

          {/* Feature Flag — Select populated from fetched flags */}
          <FormControl
            fullWidth
            margin="normal"
            error={Boolean(errors.flag_id)}
            disabled={loading}
          >
            <InputLabel id="flag-label">{t("Feature Flag")}</InputLabel>
            <Select
              labelId="flag-label"
              id="rule-flag-id"
              name="flag_id"
              value={form.flag_id}
              label={t("Feature Flag")}
              onChange={handleChange}
            >
              {flags.map(f => (
                <MenuItem key={f.id} value={f.id}>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                    >
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
            {errors.flag_id && (
              <FormHelperText>{t(errors.flag_id)}</FormHelperText>
            )}
          </FormControl>

          {/* Rule Type — "user" or "group" */}
          <FormControl
            fullWidth
            margin="normal"
            error={Boolean(errors.rule_type)}
            disabled={loading}
          >
            <InputLabel id="rule-type-label">{t("Rule Type")}</InputLabel>
            <Select
              labelId="rule-type-label"
              id="rule-type"
              name="rule_type"
              value={form.rule_type}
              label={t("Rule Type")}
              onChange={handleChange}
            >
              <MenuItem value="user">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                  User
                </Box>
              </MenuItem>
              <MenuItem value="group">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                  Group
                </Box>
              </MenuItem>
            </Select>
            {errors.rule_type && (
              <FormHelperText>{t(errors.rule_type)}</FormHelperText>
            )}
          </FormControl>

          {/* Rule Value — username or group_name */}
          <TextField
            fullWidth
            id="rule-value"
            label={t("Rule Value")}
            name="rule_value"
            value={form.rule_value}
            onChange={handleChange}
            error={Boolean(errors.rule_value)}
            helperText={t(ruleValueHelperText())}
            margin="normal"
            disabled={loading}
            slotProps={{
              htmlInput: { maxLength: 255 },
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
function DeleteConfirmDialog({ open, onClose, onConfirm, rule, flagMap, loading }) {
  const { t } = useTranslation()
  const flagKey = rule ? (flagMap[rule.flag_id] ?? `Flag #${rule.flag_id}`) : ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("Delete Targeting Rule")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("Are you sure you want to delete this targeting rule? This cannot be undone.")}
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
// TargetingRules Page
// ---------------------------------------------------------------------------
function TargetingRules() {
  const { t } = useTranslation()
  // ---- reference data ----
  const [flags,   setFlags]   = useState([])
  const [flagMap, setFlagMap] = useState({})   // { [id]: key }

  // ---- targeting rule rows ----
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  // ---- dialogs ----
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected,   setSelected]   = useState(null)

  // ---- per-dialog submission spinner ----
  const [submitting, setSubmitting] = useState(false)

  // ---- toast ----
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  // ---------------------------------------------------------------------------
  // Load rules + flags in parallel on mount.
  // Rules need the flag list to display human-readable keys in the table.
  // ---------------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [rules, flagList] = await Promise.all([
        fetchTargetingRules(),
        fetchFeatureFlags(),
      ])
      setRows(rules)
      setFlags(flagList)
      setFlagMap(buildFlagMap(flagList))
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
  // Create — POST /targeting-rules/
  // ---------------------------------------------------------------------------
  async function handleCreate(payload) {
    setSubmitting(true)
    try {
      const created = await createTargetingRule(payload)
      setRows(prev => [...prev, created])
      setCreateOpen(false)
      const flagKey = flagMap[created.flag_id] ?? `Flag #${created.flag_id}`
      showToast(t('Rule for "{{flagKey}}" created.', { flagKey }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete — DELETE /targeting-rules/{id}
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    setSubmitting(true)
    try {
      await deleteTargetingRule(selected.id)
      setRows(prev => prev.filter(r => r.id !== selected.id))
      setDeleteOpen(false)
      const flagKey = flagMap[selected.flag_id] ?? `Flag #${selected.flag_id}`
      showToast(t('Rule for "{{flagKey}}" deleted.', { flagKey }))
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
            {t("Targeting Rules")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            {t("Define per-user and per-group targeting rules for feature flags.")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {t("New Rule")}
        </Button>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>

          {loading ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'background.default', borderBottom: '2px solid', borderColor: 'divider' }}>
                {[50, 160, 80, 140, 60].map((w, i) => <Skeleton key={i} variant="text" width={w} height={18} />)}
              </Box>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  {[50, 160, 80, 140, 60].map((w, j) => <Skeleton key={j} variant="text" width={w} height={16} />)}
                </Box>
              ))}
            </Box>

          ) : rows.length === 0 ? (
            /* Empty state */
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <TrackChangesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t("No targeting rules yet.")}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
                {t("Create rules to control flag rollout for specific users or groups.")}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                {t("Create your first rule")}
              </Button>
            </Box>

          ) : (
            /* Data table */
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 600 }}>
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
                        whiteSpace:    'nowrap',
                      },
                    }}
                  >
                    <TableCell>{t("ID")}</TableCell>
                    <TableCell>{t("Feature Flag")}</TableCell>
                    <TableCell>{t("Rule Type")}</TableCell>
                    <TableCell>{t("Rule Value")}</TableCell>
                    <TableCell align="right">{t("Actions")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map(row => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        cursor:     'default',
                        transition: 'background-color 0.2s ease',
                        '&:last-child td': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(99,102,241,0.04)' },
                      }}
                    >
                      {/* ID */}
                      <TableCell sx={{ color: 'text.secondary', width: 60 }}>
                        {row.id}
                      </TableCell>

                      {/* Feature Flag — resolved from flagMap */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontFamily: 'monospace', fontSize: 13 }}
                        >
                          {flagMap[row.flag_id] ?? `Flag #${row.flag_id}`}
                        </Typography>
                      </TableCell>

                      {/* Rule Type — coloured Chip */}
                      <TableCell>
                        {(() => {
                          const cfg = RULE_TYPE_CONFIG[row.rule_type] ?? { label: row.rule_type, color: 'default' }
                          return (
                            <Chip
                              label={cfg.label}
                              color={cfg.color}
                              size="small"
                              sx={{ fontWeight: 600, fontSize: 12 }}
                            />
                          )
                        })()}
                      </TableCell>

                      {/* Rule Value */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.primary' }}
                        >
                          {row.rule_value}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Tooltip title={t("Delete")} arrow>
                          <IconButton
                            size="small"
                            onClick={() => openDelete(row)}
                            sx={{
                              color:      'error.main',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor:   'action.hover',
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
      <CreateRuleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
        flags={flags}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirmation Dialog                                         */}
      {/* ------------------------------------------------------------------ */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        rule={selected}
        flagMap={flagMap}
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

export default TargetingRules
