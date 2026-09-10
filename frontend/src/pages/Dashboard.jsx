import { useState, useEffect } from 'react'
import { useTheme } from '@mui/material/styles'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import EnvIcon          from '@mui/icons-material/CloudOutlined'
import FlagIcon         from '@mui/icons-material/FlagOutlined'
import ActiveIcon       from '@mui/icons-material/CheckCircleOutlined'
import TodayIcon        from '@mui/icons-material/TodayOutlined'
import EnabledIcon      from '@mui/icons-material/CheckCircleOutlined'
import DisabledIcon     from '@mui/icons-material/CancelOutlined'
import ErrorIcon        from '@mui/icons-material/ErrorOutlineOutlined'
import HistoryIcon      from '@mui/icons-material/HistoryRounded'
import ArrowIcon        from '@mui/icons-material/ArrowForwardRounded'
import BarChartIcon     from '@mui/icons-material/BarChartRounded'
import PieChartIcon     from '@mui/icons-material/PieChartRounded'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getStoredUser }        from '../services/authService'
import { fetchFeatureFlags }    from '../services/featureFlagService'
import {
  fetchDashboardStats,
  fetchFlagEvaluationStats,
  fetchEnvironmentUsage,
  fetchRecentAudit,
} from '../services/analyticsService'

// ---------------------------------------------------------------------------
// Design tokens — use theme.palette everywhere; these are accent colours only
// ---------------------------------------------------------------------------
const CARD_RADIUS  = '24px'
const CARD_SHADOW  = '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)'
const HOVER_SHADOW = '0 8px 24px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06)'
const TRANSITION   = 'all 0.2s ease'

// Pie chart palette — distinct colours for up to 8 environments
const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#14b8a6']

// Muted text colour — use as inline sx value, not as a JS variable,
// so MUI theme tokens take precedence in dark mode. This constant is kept
// only for the few JSX places that reference it; all new code uses
// color: 'text.secondary' directly.
const MUTED = 'text.secondary'

// ---------------------------------------------------------------------------
// CARD_CONFIG — 4 stat cards now driven by analytics API
// ---------------------------------------------------------------------------
const CARD_CONFIG = [
  {
    key:        'total_flags',
    boldLabel:  'Feature Flags',
    mutedLabel: 'Total Feature Flags',
    icon:       <FlagIcon sx={{ fontSize: 30 }} />,
    accent:     '#10b981',
    iconColor:  '#10b981',
  },
  {
    key:        'active_flags',
    boldLabel:  'Active Flags',
    mutedLabel: 'Currently Enabled',
    icon:       <ActiveIcon sx={{ fontSize: 30 }} />,
    accent:     '#8b5cf6',
    iconColor:  '#8b5cf6',
  },
  {
    key:        'today_evaluations',
    boldLabel:  'Evaluations Today',
    mutedLabel: 'Flag evaluations (UTC)',
    icon:       <TodayIcon sx={{ fontSize: 30 }} />,
    accent:     '#6366f1',
    iconColor:  '#6366f1',
  },
  {
    key:        'audit_logs_today',
    boldLabel:  'Audit Logs Today',
    mutedLabel: 'Total audit events (UTC)',
    icon:       <EnvIcon sx={{ fontSize: 30 }} />,
    accent:     '#f59e0b',
    iconColor:  '#f59e0b',
  },
]

// ---------------------------------------------------------------------------
// StatCard — unchanged from original
// ---------------------------------------------------------------------------
function StatCard({ icon, boldLabel, mutedLabel, count, accent, iconColor, loading, error }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: CARD_RADIUS,
        border:       '1px solid',
        borderColor:  'divider',
        borderLeft:   `4px solid ${accent}`,
        boxShadow:    CARD_SHADOW,
        bgcolor:      'background.paper',
        height:       '100%',
        minHeight:    172,
        transition:   TRANSITION,
        '&:hover': {
          boxShadow: HOVER_SHADOW,
          transform: 'translateY(-3px)',
        },
      }}
    >
      <CardContent sx={{ p: '28px !important', height: '100%', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <>
                <Skeleton width={64} height={58} sx={{ borderRadius: 1, mb: 1 }} />
                <Skeleton width={120} height={20} sx={{ mb: 0.75 }} />
                <Skeleton width={100} height={16} />
              </>
            ) : (
              <>
                <Typography sx={{
                  fontSize: { xs: (count ?? 0) >= 100 ? '1.75rem' : '2.1rem', sm: (count ?? 0) >= 100 ? '2.1rem' : '2.6rem' },
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.06em',
                  color: 'text.primary',
                }}>
                  {error ? '—' : (count ?? 0)}
                </Typography>
                <Typography component="div" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary', mb: 0.5, mt: 0.75, lineHeight: 1.3 }}>
                  {boldLabel}
                </Typography>
                <Typography component="div" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.4 }}>
                  {mutedLabel}
                </Typography>
              </>
            )}
          </Box>
          <Box sx={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}18, ${accent}30)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: iconColor, flexShrink: 0,
            boxShadow: `0 4px 16px ${accent}28`,
            backdropFilter: 'blur(4px)',
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
// ---------------------------------------------------------------------------
// LegendRow — unchanged from original
// ---------------------------------------------------------------------------
function LegendRow({ icon, label, count, pct }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary' }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary' }}>
        {count}{' '}
        <Typography component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 400 }}>
          ({pct}%)
        </Typography>
      </Typography>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// FlagBreakdownCard — unchanged from original
// ---------------------------------------------------------------------------
function FlagBreakdownCard({ flags, loading, error }) {
  const { t } = useTranslation()
  const enabled     = flags.filter(f => f.enabled).length
  const disabled    = flags.length - enabled
  const total       = flags.length || 1
  const enabledPct  = Math.round((enabled  / total) * 100)
  const disabledPct = 100 - enabledPct
  return (
    <Card elevation={0} sx={{ borderRadius: CARD_RADIUS, border: '1px solid', borderColor: 'divider', boxShadow: CARD_SHADOW, bgcolor: 'background.paper', height: '100%', minHeight: 430, transition: TRANSITION, '&:hover': { boxShadow: HOVER_SHADOW, transform: 'translateY(-3px)' } }}>
      <CardContent sx={{ p: '32px !important' }}>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary', mb: 0.75 }}>{t("Flag Status Breakdown")}</Typography>
        <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.6, mb: 3 }}>{t("Global enabled / disabled split across all feature flags.")}</Typography>
        {loading ? (
          <><Skeleton variant="rounded" height={10} sx={{ borderRadius: '999px', mb: 3 }} /><Skeleton width="65%" sx={{ mb: 1.5 }} /><Skeleton width="65%" /></>
        ) : error ? (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{t("Data unavailable.")}</Typography>
        ) : flags.length === 0 ? (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{t("No feature flags yet.")}</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', borderRadius: '999px', overflow: 'hidden', height: 10, bgcolor: 'action.hover', mb: 3 }}>
              <Box sx={{ width: `${enabledPct}%`, bgcolor: 'success.main', transition: 'width 0.4s ease' }} />
              <Box sx={{ width: `${disabledPct}%`, bgcolor: 'error.light', transition: 'width 0.4s ease' }} />
            </Box>
            <Box>
              <LegendRow icon={<EnabledIcon sx={{ fontSize: 18, color: 'success.main' }} />} label={t("Enabled")}  count={enabled}  pct={enabledPct} />
              <Divider sx={{ opacity: 0.35 }} />
              <LegendRow icon={<DisabledIcon sx={{ fontSize: 18, color: 'error.light' }} />} label={t("Disabled")} count={disabled} pct={disabledPct} />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// RecentFlagsCard — unchanged from original
// ---------------------------------------------------------------------------
function RecentFlagsCard({ flags, loading, error }) {
  const { t } = useTranslation()
  const recent = [...flags].reverse().slice(0, 5)
  return (
    <Card elevation={0} sx={{ borderRadius: CARD_RADIUS, border: '1px solid', borderColor: 'divider', boxShadow: CARD_SHADOW, bgcolor: 'background.paper', height: '100%', minHeight: 430, transition: TRANSITION, '&:hover': { boxShadow: HOVER_SHADOW, transform: 'translateY(-3px)' } }}>
      <CardContent sx={{ p: '32px !important', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary', mb: 0.75 }}>{t("Recent Feature Flags")}</Typography>
        <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.6, mb: 2.5 }}>{t("The 5 most recently created flags.")}</Typography>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} sx={{ py: 2.25 }}>
              <Skeleton width="52%" height={18} />
              <Skeleton width="36%" height={14} sx={{ mt: 0.75 }} />
            </Box>
          ))
        ) : error ? (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{t("Data unavailable.")}</Typography>
        ) : recent.length === 0 ? (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{t("No feature flags yet.")}</Typography>
        ) : (
          <Box sx={{ flex: 1 }}>
            {recent.map((flag, idx) => (
              <Box key={flag.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2.25 }}>
                  <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', mb: flag.description ? 0.5 : 0 }}>{flag.key}</Typography>
                    {flag.description && <Typography noWrap sx={{ fontSize: '0.8125rem', color: 'text.secondary', display: 'block', maxWidth: 260 }}>{flag.description}</Typography>}
                  </Box>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: flag.enabled ? 'success.main' : 'error.main', flexShrink: 0, boxShadow: flag.enabled ? '0 0 0 3px rgba(16,185,129,0.18)' : '0 0 0 3px rgba(239,68,68,0.18)' }} aria-label={flag.enabled ? t('Enabled') : t('Disabled')} role="img" />
                </Box>
                {idx < recent.length - 1 && <Divider sx={{ opacity: 0.35 }} />}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// WidgetCard — reusable card wrapper for new analytics sections.
// Provides a consistent header (title + subtitle) and body area.
// Loading and error states are handled here so chart components stay clean.
// ---------------------------------------------------------------------------
function WidgetCard({ title, subtitle, loading, error, minH = 320, children }) {
  return (
    <Card elevation={0} sx={{
      borderRadius: CARD_RADIUS,
      border:       '1px solid',
      borderColor:  'divider',
      boxShadow:    CARD_SHADOW,
      bgcolor:      'background.paper',
      height:       '100%',
      transition:   TRANSITION,
      '&:hover': { boxShadow: HOVER_SHADOW, transform: 'translateY(-2px)' },
    }}>
      <CardContent sx={{ p: { xs: '24px !important', sm: '36px !important' } }}>
        {/* Title */}
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'text.primary', mb: 0.5, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        {/* Subtitle — lighter, more room below */}
        {subtitle && (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.6, mb: 3 }}>
            {subtitle}
          </Typography>
        )}
        {loading ? (
          <Box sx={{ minHeight: minH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1, pt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: minH - 60, px: 1 }}>
              {[55, 80, 40, 90, 65, 70, 45, 85].map((h, i) => (
                <Skeleton key={i} variant="rounded" width="100%" height={`${h}%`} sx={{ borderRadius: '6px 6px 0 0', flexShrink: 0 }} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={12} sx={{ borderRadius: 1 }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ACTION_CHIP_MAP — coloured chips for audit action labels
// Uses MUI semantic color names so they render correctly in both themes.
// ---------------------------------------------------------------------------
const ACTION_CHIP_MAP = {
  // Feature flag lifecycle
  'Create Flag':      { label: 'Create Flag',      muiColor: 'success'   },
  'Update Flag':      { label: 'Update Flag',      muiColor: 'info'      },
  'Delete Flag':      { label: 'Delete Flag',      muiColor: 'error'     },
  'Enable Flag':      { label: 'Enable Flag',      muiColor: 'success'   },
  'Disable Flag':     { label: 'Disable Flag',     muiColor: 'warning'   },
  'Rollout Changed':  { label: 'Rollout Changed',  muiColor: 'secondary' },
  // Targeting
  'User Target Added':    { label: 'User Target Added',    muiColor: 'info'    },
  'User Target Removed':  { label: 'User Target Removed',  muiColor: 'error'   },
  'Group Target Added':   { label: 'Group Target Added',   muiColor: 'info'    },
  'Group Target Removed': { label: 'Group Target Removed', muiColor: 'error'   },
  // Override
  'Override Changed':     { label: 'Override Changed',     muiColor: 'warning' },
  // Evaluation
  'Evaluate Feature Flag':               { label: 'Evaluate', muiColor: 'primary' },
  'Evaluate Feature Flag (Enhanced)':    { label: 'Evaluate', muiColor: 'primary' },
  'Evaluate Feature Flag (Targeting Rule)': { label: 'Evaluate', muiColor: 'primary' },
  'Evaluate Feature Flag (Percentage Rollout)': { label: 'Evaluate', muiColor: 'primary' },
  // Auth
  'User Login':   { label: 'User Login',  muiColor: 'default' },
  'User Signup':  { label: 'User Signup', muiColor: 'default' },
}

// ActionChip — renders a coloured Chip for a known action, plain text for unknown ones.
function ActionChip({ action }) {
  const cfg = ACTION_CHIP_MAP[action]
  if (!cfg) {
    return (
      <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
        {action}
      </Typography>
    )
  }
  return (
    <Chip
      label={cfg.label}
      size="small"
      color={cfg.muiColor}
      sx={{
        fontWeight: 700,
        fontSize:   '0.7rem',
        height:     22,
        borderRadius: '6px',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// ChartTooltip — custom Recharts tooltip for the bar chart
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const tooltipBg   = theme.palette.mode === 'dark' ? '#1e293b' : '#0f172a'
  const tooltipText = '#f1f5f9'
  const tooltipMuted = '#94a3b8'
  if (!active || !payload?.length) return null
  const fullName = payload[0]?.payload?.fullName ?? label
  const count    = payload[0]?.value ?? 0
  return (
    <Box sx={{ bgcolor: tooltipBg, color: tooltipText, px: 2, py: 1.5, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 160 }}>
      <Typography sx={{ color: tooltipMuted, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
        {t("Feature Flag")}
      </Typography>
      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: tooltipText, fontWeight: 600, mb: 0.75, wordBreak: 'break-all' }}>
        {fullName}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#818cf8', flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, color: '#818cf8', fontSize: '0.875rem' }}>
          {count.toLocaleString()}
        </Typography>
        <Typography sx={{ color: tooltipMuted, fontSize: '0.75rem' }}>{t("evaluations")}</Typography>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// PieTooltip — shows name, count, and percentage of total evaluations
// ---------------------------------------------------------------------------
function PieTooltip({ active, payload }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const tooltipBg   = theme.palette.mode === 'dark' ? '#1e293b' : '#0f172a'
  const tooltipText = '#f1f5f9'
  const tooltipMuted = '#94a3b8'
  if (!active || !payload?.length) return null
  const entry   = payload[0]
  const name    = entry.name
  const value   = entry.value
  const pct     = entry.payload?.percent != null
    ? (entry.payload.percent * 100).toFixed(1)
    : null
  const fill    = entry.payload?.fill ?? entry.fill ?? '#6366f1'

  return (
    <Box sx={{ bgcolor: tooltipBg, color: tooltipText, px: 2, py: 1.5, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 170 }}>
      <Typography sx={{ color: tooltipMuted, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
        {t("Environment")}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', color: tooltipText, fontWeight: 600, mb: 0.75 }}>
        {name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: fill, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, color: tooltipText, fontSize: '0.875rem' }}>
          {value.toLocaleString()}
        </Typography>
        <Typography sx={{ color: tooltipMuted, fontSize: '0.75rem' }}>{t("evaluations")}</Typography>
      </Box>
      {pct != null && (
        <Typography sx={{ color: tooltipMuted, fontSize: '0.75rem', mt: 0.25 }}>
          {t("{{pct}}% of Total Evaluations", { pct })}
        </Typography>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// ENV_COLORS — named colours per well-known environment.
// Falls back to PIE_COLORS palette for unknown names.
// ---------------------------------------------------------------------------
const ENV_COLORS = {
  development: '#10b981',   // green
  staging:     '#f59e0b',   // orange
  production:  '#3b82f6',   // blue
  qa:          '#ef4444',   // red
  uat:         '#8b5cf6',   // purple
}

function envColor(name, index) {
  if (!name) return PIE_COLORS[index % PIE_COLORS.length]
  return ENV_COLORS[name.toLowerCase()] ?? PIE_COLORS[index % PIE_COLORS.length]
}

// ---------------------------------------------------------------------------
// AnalyticsSummary — small "Total Evaluations: X" caption shown above charts
// ---------------------------------------------------------------------------
function AnalyticsSummary({ total }) {
  const { t } = useTranslation()
  if (total == null) return null
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.75,
      mb: 2.5, px: 1.25, py: 0.4,
      bgcolor: 'action.hover',
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0 1px 4px rgba(99,102,241,0.08)',
    }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {t("Total Evaluations")}
      </Typography>
      <Box sx={{ width: 1, height: 12, bgcolor: 'divider', mx: 0.25 }} />
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
        {total.toLocaleString()}
      </Typography>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Truncate a flag key to maxLen chars for X-axis display; full name goes
// into the datum's `fullName` field for the tooltip.
const TRUNCATE_LEN = 14
function truncateName(str) {
  if (!str) return ''
  return str.length > TRUNCATE_LEN ? str.slice(0, TRUNCATE_LEN) + '…' : str
}
// ---------------------------------------------------------------------------
// FlagEvalChart — BarChart, top 10 sorted desc, truncated X-axis labels
// Data: GET /analytics/flags  →  { flags: [{flag_key, evaluation_count}] }
// ---------------------------------------------------------------------------
function FlagEvalChart({ data, loading, error }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const axisTickColor  = theme.palette.text.secondary
  const axisLineColor  = theme.palette.divider
  const gridLineColor  = theme.palette.divider
  const barLabelColor  = theme.palette.primary.main

  const rawFlags  = data?.flags ?? []
  const sorted    = rawFlags.slice().sort((a, b) => b.evaluation_count - a.evaluation_count)
  const top10     = sorted.slice(0, 10)
  const chartData = top10.map(f => ({
    fullName: f.flag_key ?? `Flag #${f.flag_id}`,
    name:     truncateName(f.flag_key ?? `Flag #${f.flag_id}`),
    count:    f.evaluation_count,
  }))

  const n            = chartData.length
  const bottomMargin = n > 6 ? 52 : 40
  const chartHeight  = 340
  const total        = data?.total_evaluations ?? null

  return (
    <WidgetCard
      title={t("Feature Evaluation Counts")}
      subtitle={n > 0 ? t("Top {{n}} Feature Flags by Evaluation Count", { n }) : t("Top 5 Feature Flags by Evaluation Count")}
      loading={loading}
      error={error}
      minH={300}
    >
      {chartData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BarChartIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
            {t("No analytics data available yet.")}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>
            {t("Evaluations will appear here once flags are evaluated.")}
          </Typography>
        </Box>
      ) : (
        <>
          <AnalyticsSummary total={total} />
          {/* Gradient defs for bars */}
          <svg width={0} height={0} style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity={1} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
              </linearGradient>
            </defs>
          </svg>
          <Box role="img" aria-label={t("Feature flag evaluation counts bar chart")}>
            <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              barCategoryGap="30%"
              margin={{ top: 24, right: 8, left: 0, bottom: bottomMargin }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridLineColor} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: axisTickColor, fontFamily: 'monospace' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                tickLine={false}
                axisLine={{ stroke: axisLineColor }}
                dy={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisTickColor }}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ReTooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'rgba(99,102,241,0.07)', radius: 6 }}
                animationDuration={150}
              />
              <Bar
                dataKey="count"
                fill="url(#barGradient)"
                radius={[8, 8, 0, 0]}
                maxBarSize={52}
                isAnimationActive={true}
                animationDuration={700}
                animationEasing="ease-out"
                label={{
                  position:   'top',
                  fontSize:   12,
                  fill:       barLabelColor,
                  fontWeight: 700,
                  formatter:  v => v > 0 ? v.toLocaleString() : '',
                }}
              />
            </BarChart>
          </ResponsiveContainer>
          </Box>
        </>
      )}
    </WidgetCard>
  )
}

// ---------------------------------------------------------------------------
// EnvUsageChart — PieChart, sorted, named colours, total evaluations caption
// Data: GET /analytics/environment-usage
// ---------------------------------------------------------------------------
function EnvUsageChart({ data, loading, error }) {
  const { t } = useTranslation()
  // Sort desc by evaluation count before rendering
  const sorted = (data?.environments ?? [])
    .slice()
    .sort((a, b) => b.evaluation_count - a.evaluation_count)

  const total     = data?.total_evaluations ?? null
  const chartData = sorted.map((e, i) => ({
    name:  e.environment_name ?? `Env #${e.environment_id}`,
    value: e.evaluation_count,
    // Named colour lookup; falls back to generic palette
    fill:  envColor(e.environment_name, i),
  }))

  return (
    <WidgetCard
      title={t("Environment Usage")}
      subtitle={t("Evaluation events per deployment environment.")}
      loading={loading}
      error={error}
      minH={300}
    >
      {chartData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PieChartIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
            {t("No analytics data available yet.")}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>
            {t("Environment usage will appear once flags are evaluated.")}
          </Typography>
        </Box>
      ) : (
        <>
          <AnalyticsSummary total={total} />
          <Box role="img" aria-label={t("Environment usage pie chart")}>
            <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={105}
                paddingAngle={3}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={true}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <ReTooltip content={<PieTooltip />} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.8125rem', paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          </Box>
        </>
      )}
    </WidgetCard>
  )
}

// ---------------------------------------------------------------------------
// RecentAuditWidget — table of latest audit entries + "View All" button
// Data: GET /analytics/recent-audit  →  { entries: [AuditLogResponse] }
// ---------------------------------------------------------------------------
function RecentAuditWidget({ data, loading, error }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const entries  = data?.entries ?? []

  function formatTs(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <WidgetCard
      title={t("Recent Audit Activity")}
      subtitle={t("Latest 10 system audit events.")}
      loading={loading}
      error={error}
      minH={260}
    >
      {/* Table */}
      {entries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <HistoryIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: '0.875rem', color: MUTED }}>{t("No audit entries yet.")}</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ mb: 2.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.default', color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid', borderColor: 'divider', whiteSpace: 'nowrap' } }}>
                <TableCell>{t("Time")}</TableCell>
                <TableCell>{t("User")}</TableCell>
                <TableCell>{t("Action")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.slice(0, 10).map(row => (
                <TableRow key={row.id} sx={{ '&:last-child td': { border: 0 }, '&:hover': { bgcolor: 'rgba(99,102,241,0.04)' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.8125rem' }}>
                    {formatTs(row.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main', fontWeight: 600 }}>
                      {row.performed_by}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ActionChip action={row.action} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View All button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          endIcon={<ArrowIcon fontSize="small" />}
          onClick={() => navigate('/audit-logs')}
          sx={{ borderRadius: 2, fontSize: '0.8125rem', fontWeight: 600 }}
        >
          {t("View All Audit Logs")}
        </Button>
      </Box>
    </WidgetCard>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
function Dashboard() {
  const { t } = useTranslation()
  const user = getStoredUser()

  // ---- existing: feature flags for FlagBreakdown + RecentFlags ----
  const [flags,      setFlags]      = useState([])
  const [flagsStatus, setFlagsStatus] = useState('loading')

  // ---- analytics: each widget has its own independent state ----
  const [dashStats,       setDashStats]       = useState(null)
  const [dashStatsStatus, setDashStatsStatus] = useState('loading')

  const [flagEval,       setFlagEval]       = useState(null)
  const [flagEvalStatus, setFlagEvalStatus] = useState('loading')

  const [envUsage,       setEnvUsage]       = useState(null)
  const [envUsageStatus, setEnvUsageStatus] = useState('loading')

  const [recentAudit,       setRecentAudit]       = useState(null)
  const [recentAuditStatus, setRecentAuditStatus] = useState('loading')

  const [globalError, setGlobalError] = useState('')

  // ---- load all data in parallel ----
  useEffect(() => {
    Promise.allSettled([
      fetchFeatureFlags(),
      fetchDashboardStats(),
      fetchFlagEvaluationStats(),
      fetchEnvironmentUsage(),
      fetchRecentAudit(10),
    ]).then(([flagsResult, dashResult, flagEvalResult, envUsageResult, recentAuditResult]) => {
      if (flagsResult.status === 'fulfilled') { setFlags(flagsResult.value); setFlagsStatus('success') }
      else { setFlagsStatus('error') }

      if (dashResult.status === 'fulfilled') { setDashStats(dashResult.value); setDashStatsStatus('success') }
      else { setDashStatsStatus('error') }

      if (flagEvalResult.status === 'fulfilled') { setFlagEval(flagEvalResult.value); setFlagEvalStatus('success') }
      else { setFlagEvalStatus('error') }

      if (envUsageResult.status === 'fulfilled') { setEnvUsage(envUsageResult.value); setEnvUsageStatus('success') }
      else { setEnvUsageStatus('error') }

      if (recentAuditResult.status === 'fulfilled') { setRecentAudit(recentAuditResult.value); setRecentAuditStatus('success') }
      else { setRecentAuditStatus('error') }
    })
  }, [])

  return (
    <Box>

      {/* ================================================================
          SECTION 1 — Welcome header (unchanged)
          ================================================================ */}
      <Box mb={5}>
        <Typography component="h1" sx={{ fontSize: { xs: '2rem', sm: '2.4rem', md: '2.8rem', lg: '2.4rem' }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: 'text.primary', mb: 1 }}>
          {t("Welcome back, {{username}} 👋", { username: user?.username ?? 'User' })}
        </Typography>
        <Typography sx={{ fontSize: { xs: '1.0rem', sm: '1.0rem' }, fontWeight: 400, color: MUTED, lineHeight: 1.65, maxWidth: 560, mb: 5 }}>
          {t("Here's a live overview of your Feature Management System.")}
        </Typography>
      </Box>

      {globalError && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 4, borderRadius: '16px' }} onClose={() => setGlobalError('')}>
          {globalError}
        </Alert>
      )}

      {/* ================================================================
          SECTION 2 — 4 KPI stat cards (now from analytics API)
          ================================================================ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, minmax(220px, 1fr))' }, gap: '28px', mb: 5 }}>
        {CARD_CONFIG.map(card => (
          <StatCard
            key={card.key}
            icon={card.icon}
            boldLabel={t(card.boldLabel)}
            mutedLabel={t(card.mutedLabel)}
            accent={card.accent}
            iconColor={card.iconColor}
            count={dashStats?.[card.key] ?? null}
            loading={dashStatsStatus === 'loading'}
            error={dashStatsStatus === 'error'}
          />
        ))}
      </Box>

      {/* ================================================================
          SECTION 3 — Flag Breakdown + Recent Flags (unchanged)
          ================================================================ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '32px', mb: 5 }}>
        <FlagBreakdownCard flags={flags} loading={flagsStatus === 'loading'} error={flagsStatus === 'error'} />
        <RecentFlagsCard   flags={flags} loading={flagsStatus === 'loading'} error={flagsStatus === 'error'} />
      </Box>

      {/* ================================================================
          SECTION 4 — Feature Evaluation + Environment Usage charts
          Side-by-side on desktop, stacked on tablet/mobile
          ================================================================ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: '32px', mb: 5 }}>
        <FlagEvalChart
          data={flagEval}
          loading={flagEvalStatus === 'loading'}
          error={flagEvalStatus === 'error' ? 'Failed to load flag evaluation data.' : null}
        />
        <EnvUsageChart
          data={envUsage}
          loading={envUsageStatus === 'loading'}
          error={envUsageStatus === 'error' ? 'Failed to load environment usage data.' : null}
        />
      </Box>

      {/* ================================================================
          SECTION 5 — Recent Audit Activity (full width)
          ================================================================ */}
      <RecentAuditWidget
        data={recentAudit}
        loading={recentAuditStatus === 'loading'}
        error={recentAuditStatus === 'error' ? 'Failed to load recent audit activity.' : null}
      />

    </Box>
  )
}

export default Dashboard
