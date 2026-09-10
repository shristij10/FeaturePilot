import { useState, useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import EvaluateIcon from '@mui/icons-material/PlayArrowRounded'
import SuccessIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import ErrorIcon from '@mui/icons-material/ErrorOutlineOutlined'

import { fetchFeatureFlags }  from '../services/featureFlagService'
import { fetchEnvironments }  from '../services/environmentService'
import { evaluateFlag }       from '../services/flagEvaluationService'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Visual config for the four possible `source` values returned by the backend.
// label    — human-readable chip text
// color    — MUI Chip color prop
// desc     — helper sentence shown below the chip in the result card
const SOURCE_CONFIG = {
  override: {
    label: 'Override',
    color: 'primary',
    desc:  'Value was resolved from a per-environment override record.',
  },
  default: {
    label: 'Default',
    color: 'warning',
    desc:  "No override exists — the flag's default value was used.",
  },
  disabled: {
    label: 'Disabled',
    color: 'error',
    desc:  'The flag is globally disabled. This feature is off regardless of the value.',
  },
  targeting_rule: {
    label: 'Targeting Rule',
    color: 'info',
    desc:  'Value was resolved from a matching user-level or group-level targeting rule.',
  },
  percentage_rollout: {
    label: 'Percentage Rollout',
    color: 'secondary',
    desc:  'Value was resolved via deterministic SHA-256 bucket assignment against the rollout percentage threshold.',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Converts any value the backend may return into a readable display string.
// value can be: bool, int, float, string, object, array.
function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2)
  return String(value)
}

// Returns the MUI Chip color for the enabled boolean
function enabledColor(enabled) {
  return enabled ? 'success' : 'error'
}

// Tries to parse a string as JSON. Returns { ok: true, value } or { ok: false, error }.
function tryParseJson(str) {
  if (!str.trim()) return { ok: true, value: null }
  try {
    const parsed = JSON.parse(str)
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      return { ok: false, error: 'User context must be a JSON object (e.g. {"user_id":"123"}).' }
    }
    return { ok: true, value: parsed }
  } catch {
    return { ok: false, error: 'Invalid JSON. Please check your syntax.' }
  }
}

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------
// Renders the evaluation response in a structured card.
// Props:
//   result  — FlagEvaluationResponse object from the backend
// ---------------------------------------------------------------------------
function ResultCard({ result }) {
  const { t } = useTranslation()
  const src    = SOURCE_CONFIG[result.source] ?? { label: result.source, color: 'default', desc: '' }
  const isJson = typeof result.value === 'object' && result.value !== null

  // Determine value badge appearance for boolean scalars
  const isBoolValue = typeof result.value === 'boolean'
  const isTrue      = result.value === true

  // Result card header uses semantic MUI color tokens per source
  // These map to theme-aware values so dark mode works correctly
  const headerBorderColor = {
    override:           'success.light',
    default:            'warning.light',
    disabled:           'error.light',
    targeting_rule:     'info.light',
    percentage_rollout: 'secondary.light',
  }
  const headerIconColor = {
    override:           'success.main',
    default:            'warning.main',
    disabled:           'error.main',
    targeting_rule:     'info.main',
    percentage_rollout: 'secondary.main',
  }
  const hdrBorderColor = headerBorderColor[result.source] ?? 'divider'
  const hdrIconColor   = headerIconColor[result.source]   ?? 'primary.main'

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 4,
        mt: 3,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* Result card header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: hdrBorderColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon sx={{ color: hdrIconColor, fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9375rem' }}>
            {t("Evaluation Result")}
          </Typography>
        </Box>
        {/* Source chip in the header for immediate visibility */}
        <Chip
          label={src.label}
          color={src.color}
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
        />
      </Box>

      <CardContent sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3 }}>
        {/* 2-column grid of result fields */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>

          {/* Flag Key */}
          <ResultField label={t("Flag Key")}>
            <Box
              sx={{
                display: 'inline-block',
                px: 1.25,
                py: 0.5,
                bgcolor: 'action.hover',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main' }}
              >
                {result.flag_key}
              </Typography>
            </Box>
          </ResultField>

          {/* Environment */}
          <ResultField label={t("Environment")}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
              {result.environment}
            </Typography>
          </ResultField>

          {/* Enabled */}
          <ResultField label={t("Globally Enabled")}>
            <Chip
              label={result.enabled ? 'Yes' : 'No'}
              color={enabledColor(result.enabled)}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            />
          </ResultField>

          {/* Source */}
          <ResultField label={t("Resolution Source")}>
            <Box>
              <Chip
                label={src.label}
                color={src.color}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.75rem', mb: 0.75 }}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.5 }}>
                {src.desc}
              </Typography>
            </Box>
          </ResultField>

          {/* Reason — Task 3 field, always present */}
          {result.reason && (
            <ResultField label={t("Reason")}>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 1.25,
                  py: 0.5,
                  bgcolor: 'action.hover',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'text.secondary' }}
                >
                  {result.reason}
                </Typography>
              </Box>
            </ResultField>
          )}

          {/* Bucket — only shown for percentage_rollout evaluations */}
          {result.source === 'percentage_rollout' && (
            <ResultField label={t("Bucket (0–99)")}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1.5,
                  py: 0.5,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'secondary.light',
                  borderRadius: '8px',
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontFamily: 'monospace', fontSize: '0.9375rem', color: 'secondary.main' }}
                >
                  {result.bucket}
                </Typography>
              </Box>
            </ResultField>
          )}

          {/* Rollout % — only shown for percentage_rollout evaluations */}
          {result.source === 'percentage_rollout' && (
            <ResultField label={t("Rollout %")}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1.5,
                  py: 0.5,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'secondary.light',
                  borderRadius: '8px',
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontFamily: 'monospace', fontSize: '0.9375rem', color: 'secondary.main' }}
                >
                  {result.rollout_percentage}%
                </Typography>
              </Box>
            </ResultField>
          )}

        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Value — full width */}
        <ResultField label={t("Resolved Value")}>
          {isBoolValue ? (
            // TRUE/FALSE as colored badge using theme tokens
            <Chip
              label={isTrue ? 'TRUE' : 'FALSE'}
              size="medium"
              color={isTrue ? 'success' : 'error'}
              sx={{
                fontWeight: 800,
                fontSize: '0.875rem',
                letterSpacing: '0.04em',
                px: 1,
                borderRadius: '10px',
              }}
            />
          ) : isJson ? (
            // JSON object/array — dark code block (same as CodeBlock component)
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                bgcolor: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                fontFamily: '"Fira Code", Consolas, monospace',
                fontSize: '0.8125rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6,
              }}
            >
              {formatValue(result.value)}
            </Box>
          ) : (
            // String / number scalar
            <Box
              sx={{
                display: 'inline-block',
                px: 2,
                py: 0.75,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
                fontFamily: 'monospace',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {formatValue(result.value)}
            </Box>
          )}
        </ResultField>
      </CardContent>
    </Card>
  )
}

// Small layout helper — labelled field used inside ResultCard
function ResultField({ label, children }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mb={1}
        fontWeight={600}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6875rem' }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// FlagEvaluation Page
// ---------------------------------------------------------------------------
function FlagEvaluation() {
  const { t } = useTranslation()
  // ---- reference data loaded on mount ----
  const [flags,        setFlags]        = useState([])
  const [environments, setEnvironments] = useState([])
  const [refLoading,   setRefLoading]   = useState(true)  // spinner while loading dropdowns

  // ---- form state ----
  // flag_key and environment are selected from dropdowns.
  // userContextRaw is the raw textarea string — parsed to JSON before sending.
  const [selectedFlagKey, setSelectedFlagKey]       = useState('')
  const [selectedEnvName, setSelectedEnvName]       = useState('')
  const [userId, setUserId]                         = useState('')
  const [groups, setGroups]                         = useState('')
  const [userContextRaw, setUserContextRaw]         = useState('')
  // ---- per-field errors ----
  const [errors, setErrors] = useState({})

  // ---- evaluation state ----
  const [evaluating, setEvaluating] = useState(false)   // spinner on Evaluate button
  const [result,     setResult]     = useState(null)    // FlagEvaluationResponse | null
  const [evalError,  setEvalError]  = useState('')      // error message string | ''

  // ---------------------------------------------------------------------------
  // Load flags + environments in parallel on mount
  // Both are needed to populate the dropdowns and to send human-readable
  // identifiers to the evaluation endpoint.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const [flagList, envList] = await Promise.all([
          fetchFeatureFlags(),
          fetchEnvironments(),
        ])
        setFlags(flagList)
        setEnvironments(envList)
      } catch (err) {
        // Non-fatal — user sees empty dropdowns and can retry
        setEvalError('Failed to load flags or environments. Please refresh.')
      } finally {
        setRefLoading(false)
      }
    }
    load()
  }, [])

  // ---------------------------------------------------------------------------
  // Validate the form before sending
  // ---------------------------------------------------------------------------
  function validate() {
    const errs = {}
    if (!selectedFlagKey)  errs.flagKey     = 'Please select a feature flag.'
    if (!selectedEnvName)  errs.environment = 'Please select an environment.'

    if (userContextRaw.trim()) {
      const parsed = tryParseJson(userContextRaw)
      if (!parsed.ok) errs.userContext = parsed.error
    }

    return errs
  }

  // ---------------------------------------------------------------------------
  // handleEvaluate — POST /flags/evaluate
  // ---------------------------------------------------------------------------
  async function handleEvaluate(e) {
    e.preventDefault()

    // 1. Client-side validation
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    // 2. Parse user_context — empty textarea → null (backend accepts null)
    const { value: userContext } = tryParseJson(userContextRaw)

    setEvaluating(true)
    setResult(null)     // clear previous result
    setEvalError('')    // clear previous error

    try {
      // 3. Send flag_key (string) and environment (string) — not IDs.
      //    The backend resolves them by name, not by primary key.
      const data = await evaluateFlag({
        flag_key: selectedFlagKey,
        environment: selectedEnvName,
        user_id: userId.trim() || null,
        groups: groups
            ? groups.split(',').map(g => g.trim()).filter(Boolean)
            : null,
        user_context: userContext,
    })

      // 4. Display the result card
      setResult(data)
    } catch (err) {
      // 5. Show 404 / 422 / network errors inline above the button
      setEvalError(err.message)
    } finally {
      setEvaluating(false)
    }
  }

  // Clear field error as user changes a dropdown
  function handleFlagChange(e) {
    setSelectedFlagKey(e.target.value)
    if (errors.flagKey) setErrors(prev => ({ ...prev, flagKey: '' }))
    setResult(null)
    setEvalError('')
  }
  function handleEnvChange(e) {
    setSelectedEnvName(e.target.value)
    if (errors.environment) setErrors(prev => ({ ...prev, environment: '' }))
    setResult(null)
    setEvalError('')
  }
  function handleContextChange(e) {
    setUserContextRaw(e.target.value)
    if (errors.userContext) setErrors(prev => ({ ...prev, userContext: '' }))
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          {t("Flag Evaluation")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
          {t("Resolve the effective value of a feature flag for a specific environment.")}
        </Typography>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Evaluation form card                                               */}
      {/* ------------------------------------------------------------------ */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
        {/* Card header bar */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <EvaluateIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={700}>
            {t("Configure Evaluation")}
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>

          <Box component="form" onSubmit={handleEvaluate} noValidate>

            {/* Show a spinner while the dropdowns are being populated */}
            {refLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                {/* Feature Flag dropdown
                    Displays the flag key (monospace) and optional description.
                    The value sent to the backend is flag.key (a string), not flag.id,
                    because the evaluation endpoint accepts flag_key, not flag_id. */}
                <FormControl
                  fullWidth
                  margin="normal"
                  error={Boolean(errors.flagKey)}
                  disabled={evaluating}
                >
                  <InputLabel id="flag-select-label">{t("Feature Flag")}</InputLabel>
                  <Select
                    labelId="flag-select-label"
                    id="eval-flag-key"
                    name="flag_key"
                    value={selectedFlagKey}
                    label={t("Feature Flag")}
                    onChange={handleFlagChange}
                  >
                    {flags.length === 0 ? (
                      <MenuItem disabled>No feature flags found</MenuItem>
                    ) : (
                      flags.map(f => (
                        <MenuItem key={f.id} value={f.key}>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ fontFamily: 'monospace', fontSize: 13 }}
                            >
                              {f.key}
                            </Typography>
                            {f.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {f.description}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.flagKey && <FormHelperText>{errors.flagKey}</FormHelperText>}
                </FormControl>

                {/* Environment dropdown
                    The value is env.name (a string) because the evaluation endpoint
                    accepts the environment display name, not environment_id. */}
                <FormControl
                  fullWidth
                  margin="normal"
                  error={Boolean(errors.environment)}
                  disabled={evaluating}
                >
                  <InputLabel id="env-select-label">{t("Environment")}</InputLabel>
                  <Select
                    labelId="env-select-label"
                    id="eval-environment"
                    name="environment"
                    value={selectedEnvName}
                    label={t("Environment")}
                    onChange={handleEnvChange}
                  >
                    {environments.length === 0 ? (
                      <MenuItem disabled>No environments found</MenuItem>
                    ) : (
                      environments.map(env => (
                        <MenuItem key={env.id} value={env.name}>
                          {env.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.environment && <FormHelperText>{errors.environment}</FormHelperText>}
                </FormControl>

                {/* User ID */}
                <TextField
                  fullWidth
                  id="eval-user-id"
                  label={t("User ID")}
                  name="user_id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  margin="normal"
                  disabled={evaluating}
                  helperText={t("Optional. Used for user targeting and rollout.")}
                />

                {/* Groups */}
                <TextField
                  fullWidth
                  id="eval-groups"
                  label={t("Groups")}
                  name="groups"
                  value={groups}
                  onChange={(e) => setGroups(e.target.value)}
                  margin="normal"
                  disabled={evaluating}
                  helperText={t("Comma separated (e.g. Beta Users, Internal Team)")}
                />

                {/* User Context — optional JSON textarea */}
                <TextField
                  fullWidth
                  id="eval-user-context"
                  label={t("User Context (optional JSON)")}
                  name="user_context"
                  value={userContextRaw}
                  onChange={handleContextChange}
                  error={Boolean(errors.userContext)}
                  helperText={
                    errors.userContext ||
                    t("Optional additional JSON context. User ID and Groups are entered above. This field is kept for backward compatibility and extra context (for example: {\"plan\":\"pro\",\"region\":\"us-east-1\"}).")
                  }
                  margin="normal"
                  multiline
                  rows={3}
                  disabled={evaluating}
                  placeholder={'{\n  "plan": "pro"\n}'}
                  sx={{
                    '& textarea': {
                      fontFamily: 'monospace',
                      fontSize: 13,
                    },
                  }}
                />
              </>
            )}

            {/* Inline error alert — shown for 404 / 422 / network errors */}
            {evalError && (
              <Alert
                severity="error"
                icon={<ErrorIcon />}
                sx={{ mt: 2, borderRadius: 2 }}
                onClose={() => setEvalError('')}
              >
                {evalError}
              </Alert>
            )}

            {/* Evaluate button */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={evaluating || refLoading}
              startIcon={
                evaluating
                  ? <CircularProgress size={18} color="inherit" />
                  : <EvaluateIcon />
              }
              sx={{ mt: 3, borderRadius: 2, fontWeight: 600, px: 4 }}
            >
              {evaluating ? t('Evaluating…') : t('Evaluate')}
            </Button>

          </Box>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Result card — only shown after a successful evaluation             */}
      {/* ------------------------------------------------------------------ */}
      {result && <ResultCard result={result} />}

    </Box>
  )
}

export default FlagEvaluation
