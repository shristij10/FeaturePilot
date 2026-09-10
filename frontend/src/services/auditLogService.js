// auditLogService.js
// All HTTP calls for the /audit-logs resource.

import api from './api'

function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// GET /audit-logs/
// Returns all audit log records ordered newest first.
// Kept for backward compatibility — callers that need filtering should use
// fetchFilteredAuditLogs() instead.
// ---------------------------------------------------------------------------
export async function fetchAuditLogs() {
  try {
    const res = await api.get('/audit-logs/')
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load audit logs.'))
  }
}

// ---------------------------------------------------------------------------
// GET /audit-logs/?action=...&performed_by=...&flag_id=...&environment_id=...
//                 &start_date=...&end_date=...
//
// Accepts a plain object with any subset of the supported filter keys.
// Empty strings and undefined/null values are stripped before the request
// so the backend never receives a blank query parameter.
//
// Supported filter keys:
//   action         — exact match on the action label
//   performed_by   — exact match on the actor username
//   flag_id        — integer PK of the feature flag
//   environment_id — integer PK of the environment
//   start_date     — ISO 8601 lower bound (inclusive) on timestamp
//   end_date       — ISO 8601 upper bound (inclusive) on timestamp
//
// Returns an array of AuditLogResponse objects ordered newest first.
// Returns an empty array when nothing matches — never throws for zero results.
// ---------------------------------------------------------------------------
export async function fetchFilteredAuditLogs(filters = {}) {
  // Strip keys whose value is an empty string, null, or undefined so Axios
  // does not append them as blank query parameters (e.g. ?action=).
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v != null)
  )

  try {
    const res = await api.get('/audit-logs/', { params })
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load audit logs.'))
  }
}

// ---------------------------------------------------------------------------
// GET /audit-logs/{id}
// Returns a single AuditLogResponse by primary key.
// Throws an error with the backend's detail message on 404 or any other
// failure so the caller can display it directly in the UI.
// ---------------------------------------------------------------------------
export async function fetchAuditLogById(id) {
  try {
    const res = await api.get(`/audit-logs/${id}`)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, `Failed to load audit log #${id}.`))
  }
}

// ---------------------------------------------------------------------------
// GET /audit-logs/recent
// Returns the 20 most recent audit log records.
// ---------------------------------------------------------------------------
export async function fetchRecentAuditLogs() {
  try {
    const res = await api.get('/audit-logs/recent')
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load recent audit logs.'))
  }
}

// ---------------------------------------------------------------------------
// GET /audit-logs/user/{username}?limit=5
// Returns the most recent audit log records for a specific user.
// Used by the Profile page Recent Activity section.
// ---------------------------------------------------------------------------
export async function fetchUserAuditLogs(username, limit = 5) {
  try {
    const res = await api.get(`/audit-logs/user/${encodeURIComponent(username)}`, {
      params: { limit },
    })
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load recent activity.'))
  }
}
