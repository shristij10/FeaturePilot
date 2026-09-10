import { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
import HistoryIcon   from '@mui/icons-material/HistoryRounded'
import CloseIcon     from '@mui/icons-material/CloseRounded'
import FilterAltIcon from '@mui/icons-material/FilterAltRounded'
import {
  fetchFilteredAuditLogs,
  fetchAuditLogById,
} from '../services/auditLogService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const MAX_VALUE_LEN = 20
function truncate(str) {
  if (!str) return null
  return str.length > MAX_VALUE_LEN ? str.slice(0, MAX_VALUE_LEN) + '…' : str
}

/** Pretty-print a value that might be a JSON string, plain string, or null. */
function prettyState(raw) {
  if (raw == null) return null
  try { return JSON.stringify(JSON.parse(raw), null, 2) }
  catch { return raw }
}

// ---------------------------------------------------------------------------
// ValueCell — truncated cell with full-value tooltip (unchanged from original)
// ---------------------------------------------------------------------------
function ValueCell({ value }) {
  if (!value) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
        —
      </Typography>
    )
  }
  const display    = truncate(value)
  const isTruncated = value.length > MAX_VALUE_LEN
  let tooltipValue = value
  try { tooltipValue = JSON.stringify(JSON.parse(value), null, 2) }
  catch { /* leave as-is */ }

  return (
    <Tooltip
      arrow
      placement="top"
      disableHoverListener={!isTruncated}
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: '#1f2937', color: '#fff',
            maxWidth: 500, minWidth: 320,
            p: 1.5, borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            '& .MuiTooltip-arrow': { color: '#1f2937' },
          },
        },
      }}
      title={
        isTruncated ? (
          <Typography
            component="pre"
            sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.75rem', lineHeight: 1.5 }}
          >
            {tooltipValue}
          </Typography>
        ) : ''
      }
    >
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'monospace', fontSize: '0.8125rem', color: 'text.secondary',
          cursor: isTruncated ? 'help' : 'default',
          maxWidth: 200, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {display}
      </Typography>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Shared table header sx (unchanged)
// ---------------------------------------------------------------------------
const TH_SX = {
  fontWeight: 700, bgcolor: 'background.default', color: 'text.secondary',
  fontSize: '0.75rem', textTransform: 'uppercase',
  letterSpacing: '0.05em', borderBottom: '2px solid', borderColor: 'divider',
}

// ---------------------------------------------------------------------------
// EMPTY_FILTERS — single source of truth for the reset state
// ---------------------------------------------------------------------------
const EMPTY_FILTERS = {
  action:         '',
  performed_by:   '',
  flag_id:        '',
  environment_id: '',
  start_date:     '',
  end_date:       '',
}

// ---------------------------------------------------------------------------
// DetailDialog — shows full audit log details fetched by ID
// ---------------------------------------------------------------------------
function DetailDialog({ rowId, onClose }) {
  const { t } = useTranslation()
  const [detail,  setDetail]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Fetch detail whenever the dialog opens with a new rowId
  useEffect(() => {
    if (rowId == null) return
    let cancelled = false
    setDetail(null)
    setError('')
    setLoading(true)

    fetchAuditLogById(rowId)
      .then(data  => { if (!cancelled) { setDetail(data);         setLoading(false) } })
      .catch(err  => { if (!cancelled) { setError(err.message);   setLoading(false) } })

    return () => { cancelled = true }
  }, [rowId])

  const open = rowId != null

  // Metadata rows — use a stable `key` for colour logic, `label` only for display.
  // This ensures colour selection never breaks when the UI language changes.
  const metaRows = detail ? [
    { key: 'timestamp',      label: t('Timestamp'),      value: formatTimestamp(detail.timestamp) },
    { key: 'action',         label: t('Action'),         value: detail.action },
    { key: 'user',           label: t('User'),           value: detail.performed_by },
    { key: 'flag_id',        label: t('Flag ID'),        value: detail.flag_id        != null ? String(detail.flag_id)        : '—' },
    { key: 'environment_id', label: t('Environment ID'), value: detail.environment_id != null ? String(detail.environment_id) : '—' },
  ] : []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* ---- Dialog header ---- */}
      <DialogTitle
        sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1, fontWeight: 700,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          {t("Audit Log Detail")}
          {detail && (
            <Typography
              component="span"
              sx={{
                ml: 1, px: 1, py: 0.25, borderRadius: 1,
                bgcolor: 'action.hover', color: 'text.secondary',
                fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              #{detail.id}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close dialog">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5, pb: 3 }}>

        {/* Loading spinner */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error state */}
        {!loading && error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Detail content */}
        {!loading && !error && detail && (
          <Box>
            {/* Metadata grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {metaRows.map(({ key, label, value }) => (
                <Grid item xs={12} sm={6} key={key}>
                  <Box
                    sx={{
                      p: 1.5, borderRadius: 2,
                      bgcolor: 'background.default',
                      border: '1px solid', borderColor: 'divider',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.6875rem', fontWeight: 700,
                        color: 'text.disabled', textTransform: 'uppercase',
                        letterSpacing: '0.06em', mb: 0.5,
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.875rem', fontWeight: 600,
                        // Colour is driven by the stable `key`, not the translated `label`
                        color: key === 'action' ? 'primary.main'
                             : key === 'user'   ? 'primary.main'
                             : 'text.primary',
                        fontFamily: key === 'user' || key === 'flag_id' || key === 'environment_id'
                          ? 'monospace' : 'inherit',
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mb: 2.5 }} />

            {/* State snapshots */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>

              {/* Old State */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: 'text.secondary', textTransform: 'uppercase',
                    letterSpacing: '0.06em', mb: 1,
                  }}
                >
                  {t("Old State")}
                </Typography>
                {detail.old_state == null ? (
                  <Box
                    sx={{
                      p: 2, borderRadius: 2, bgcolor: 'background.default',
                      border: '1px dashed', borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                      {t("No previous state")}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    component="pre"
                    sx={{
                      m: 0, p: 2,
                      bgcolor: '#0f172a', color: '#e2e8f0',
                      borderRadius: 2,
                      fontFamily: '"Fira Code", Consolas, monospace',
                      fontSize: '0.8rem', lineHeight: 1.7,
                      overflowX: 'auto', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 320, overflowY: 'auto',
                      '&::-webkit-scrollbar':       { width: 4, height: 4 },
                      '&::-webkit-scrollbar-track': { background: 'transparent' },
                      '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: 99 },
                    }}
                  >
                    {prettyState(detail.old_state)}
                  </Box>
                )}
              </Box>

              {/* New State */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: 'text.secondary', textTransform: 'uppercase',
                    letterSpacing: '0.06em', mb: 1,
                  }}
                >
                  {t("New State")}
                </Typography>
                {detail.new_state == null ? (
                  <Box
                    sx={{
                      p: 2, borderRadius: 2, bgcolor: 'background.default',
                      border: '1px dashed', borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                      {t("No new state")}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    component="pre"
                    sx={{
                      m: 0, p: 2,
                      bgcolor: '#0f172a', color: '#e2e8f0',
                      borderRadius: 2,
                      fontFamily: '"Fira Code", Consolas, monospace',
                      fontSize: '0.8rem', lineHeight: 1.7,
                      overflowX: 'auto', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 320, overflowY: 'auto',
                      '&::-webkit-scrollbar':       { width: 4, height: 4 },
                      '&::-webkit-scrollbar-track': { background: 'transparent' },
                      '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: 99 },
                    }}
                  >
                    {prettyState(detail.new_state)}
                  </Box>
                )}
              </Box>

            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// AuditLogs Page
// ---------------------------------------------------------------------------
function AuditLogs() {
  const { t } = useTranslation()
  // ---- table data ----
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  // ---- filter state ----
  // `filters` is the committed state that actually triggers API calls.
  // `inputValues` tracks what the user is currently typing (before debounce).
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [inputValues, setInputValues] = useState(EMPTY_FILTERS)

  // ---- detail dialog ----
  const [selectedId, setSelectedId] = useState(null)

  // ---- toast (table-load errors only) ----
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error' })

  // -------------------------------------------------------------------------
  // Load table — called whenever committed filters change.
  // -------------------------------------------------------------------------
  const loadLogs = useCallback(async (currentFilters) => {
    setLoading(true)
    try {
      const data = await fetchFilteredAuditLogs(currentFilters)
      setRows(data)
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs(filters)
  }, [filters, loadLogs])

  // -------------------------------------------------------------------------
  // Debounce — text fields (action, performed_by) are debounced ~350ms.
  // Numeric fields (flag_id, environment_id) and date pickers fire immediately.
  // -------------------------------------------------------------------------
  const TEXT_FIELDS = new Set(['action', 'performed_by'])

  useEffect(() => {
    // Only debounce if the change was in a text field.
    // Check whether any text field in inputValues differs from committed filters.
    const hasTextChange = [...TEXT_FIELDS].some(
      field => inputValues[field] !== filters[field]
    )
    if (!hasTextChange) return

    const timer = setTimeout(() => {
      setFilters(inputValues)
    }, 350)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValues])

  // ---- handlers ----
  function handleFilterChange(e) {
    const { name, value } = e.target
    const updated = { ...inputValues, [name]: value }
    setInputValues(updated)

    // Date pickers and numeric fields commit immediately (no debounce needed).
    if (!TEXT_FIELDS.has(name)) {
      setFilters(updated)
    }
  }

  function handleClearFilters() {
    setInputValues(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
  }

  function closeToast() {
    setToast(prev => ({ ...prev, open: false }))
  }

  // hasActiveFilters uses inputValues so the "Active" badge and Clear button
  // respond to what the user has typed, not just committed filters.
  const hasActiveFilters = Object.values(inputValues).some(v => v !== '')

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box>

      {/* ================================================================
          Page header
          ================================================================ */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          {t("Audit Logs")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          {t("Track all important system activities.")}
        </Typography>
      </Box>

      {/* ================================================================
          Filter bar
          ================================================================ */}
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3, p: 0, overflow: 'hidden' }}
      >
        {/* Filter card header */}
        <Box
          sx={{
            px: 2.5, py: 1.5,
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider',
          }}
        >
          <FilterAltIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={700}>
            {t("Filters")}
          </Typography>
          {hasActiveFilters && (
            <Box
              sx={{
                ml: 0.5, px: 0.75, py: 0.125, borderRadius: 1,
                bgcolor: 'primary.light', color: 'primary.dark',
                fontSize: '0.6875rem', fontWeight: 700,
                opacity: 0.85,
              }}
            >
              {t("Active")}
            </Box>
          )}
        </Box>

        {/* Filter fields */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            gap: 2,
            p: 2.5,
          }}
        >
          <TextField
            label={t("Action")}
            id="filter-action"
            name="action"
            value={inputValues.action}
            onChange={handleFilterChange}
            size="small"
            placeholder="e.g. Create Flag"
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
          />
          <TextField
            label={t("User")}
            id="filter-performed-by"
            name="performed_by"
            value={inputValues.performed_by}
            onChange={handleFilterChange}
            size="small"
            placeholder="e.g. admin"
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
          />
          <TextField
            label={t("Flag ID")}
            id="filter-flag-id"
            name="flag_id"
            value={inputValues.flag_id}
            onChange={handleFilterChange}
            size="small"
            type="number"
            placeholder="e.g. 5"
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label={t("Environment ID")}
            id="filter-environment-id"
            name="environment_id"
            value={inputValues.environment_id}
            onChange={handleFilterChange}
            size="small"
            type="number"
            placeholder="e.g. 2"
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label={t("Start Date")}
            id="filter-start-date"
            name="start_date"
            value={inputValues.start_date}
            onChange={handleFilterChange}
            size="small"
            type="datetime-local"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t("End Date")}
            id="filter-end-date"
            name="end_date"
            value={inputValues.end_date}
            onChange={handleFilterChange}
            size="small"
            type="datetime-local"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        {/* Clear filters button — only shown when at least one filter is set */}
        {hasActiveFilters && (
          <Box sx={{ px: 2.5, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleClearFilters}
              sx={{ borderRadius: 2, fontSize: '0.8125rem' }}
            >
              {t("Clear Filters")}
            </Button>
          </Box>
        )}
      </Card>

      {/* ================================================================
          Table card
          ================================================================ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>

          {/* Loading state — skeleton rows */}
          {loading ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'background.default', borderBottom: '2px solid', borderColor: 'divider' }}>
                {[100, 140, 100, 60, 80, 120, 120].map((w, i) => (
                  <Skeleton key={i} variant="text" width={w} height={18} />
                ))}
              </Box>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex', gap: 2, px: 2, py: 1.75,
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  {[100, 140, 100, 60, 80, 120, 120].map((w, j) => (
                    <Skeleton key={j} variant="text" width={w} height={16} />
                  ))}
                </Box>
              ))}
            </Box>

          ) : rows.length === 0 ? (
            /* Empty state */
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {hasActiveFilters ? t('No logs match the current filters.') : t('No audit logs yet.')}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {hasActiveFilters
                  ? t('Try adjusting or clearing the filters above.')
                  : t('Logs appear here automatically after any system action.')
                }
              </Typography>
            </Box>

          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ '& th': TH_SX }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t("Timestamp")}</TableCell>
                    <TableCell>{t("User")}</TableCell>
                    <TableCell>{t("Action")}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t("Flag ID")}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{t("Env ID")}</TableCell>
                    <TableCell>{t("Old State")}</TableCell>
                    <TableCell>{t("New State")}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      sx={{
                        cursor:     'pointer',
                        transition: 'background-color 0.15s ease',
                        '&:last-child td': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(99,102,241,0.06)' },
                      }}
                    >
                      {/* Timestamp */}
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.8125rem' }}>
                        {formatTimestamp(row.timestamp)}
                      </TableCell>

                      {/* User (performed_by) */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main', fontWeight: 600 }}
                        >
                          {row.performed_by}
                        </Typography>
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', whiteSpace: 'nowrap' }}>
                          {row.action}
                        </Typography>
                      </TableCell>

                      {/* Flag ID */}
                      <TableCell>
                        {row.flag_id != null ? (
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 0.75, py: 0.25, borderRadius: 1,
                              bgcolor: 'primary.main', color: 'primary.contrastText',
                              fontSize: '0.75rem', fontWeight: 700,
                              fontFamily: 'monospace',
                              opacity: 0.85,
                            }}
                          >
                            {row.flag_id}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Environment ID */}
                      <TableCell>
                        {row.environment_id != null ? (
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 0.75, py: 0.25, borderRadius: 1,
                              bgcolor: 'success.main', color: 'success.contrastText',
                              fontSize: '0.75rem', fontWeight: 700,
                              fontFamily: 'monospace',
                              opacity: 0.85,
                            }}
                          >
                            {row.environment_id}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Old State — truncated with tooltip */}
                      <TableCell sx={{ maxWidth: 200 }}>
                        <ValueCell value={row.old_state} />
                      </TableCell>

                      {/* New State — truncated with tooltip */}
                      <TableCell sx={{ maxWidth: 200 }}>
                        <ValueCell value={row.new_state} />
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          Detail dialog — opens on row click
          ================================================================ */}
      <DetailDialog
        rowId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* ================================================================
          Snackbar — table-load errors
          ================================================================ */}
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

export default AuditLogs
