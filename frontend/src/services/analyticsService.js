// analyticsService.js
// All HTTP calls for the /analytics resource.
// All data is derived from existing tables on the backend —
// no new persistence layer is involved.

import api from './api'

function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// GET /analytics/dashboard
// Returns: { total_flags, active_flags, today_evaluations, audit_logs_today }
// Data source: COUNT queries on feature_flags and audit_logs.
// ---------------------------------------------------------------------------
export async function fetchDashboardStats() {
  try {
    const res = await api.get('/analytics/dashboard')
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load dashboard stats.'))
  }
}

// ---------------------------------------------------------------------------
// GET /analytics/flags
// Returns: { flags: [{ flag_id, flag_key, evaluation_count }], total_evaluations }
// Data source: audit_logs grouped by flag_id, joined to feature_flags.
// ---------------------------------------------------------------------------
export async function fetchFlagEvaluationStats() {
  try {
    const res = await api.get('/analytics/flags')
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load flag evaluation stats.'))
  }
}

// ---------------------------------------------------------------------------
// GET /analytics/environment-usage
// Returns: { environments: [{ environment_id, environment_name, evaluation_count }],
//            total_evaluations }
// Data source: audit_logs grouped by environment_id, joined to environments.
// ---------------------------------------------------------------------------
export async function fetchEnvironmentUsage() {
  try {
    const res = await api.get('/analytics/environment-usage')
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load environment usage.'))
  }
}

// ---------------------------------------------------------------------------
// GET /analytics/recent-audit?limit=10
// Returns: { entries: [ AuditLogResponse ], count }
// Data source: the existing audit_log_service.get_recent_audit_logs().
// ---------------------------------------------------------------------------
export async function fetchRecentAudit(limit = 10) {
  try {
    const res = await api.get('/analytics/recent-audit', { params: { limit } })
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load recent audit activity.'))
  }
}
