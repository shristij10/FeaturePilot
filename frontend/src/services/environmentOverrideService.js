// environmentOverrideService.js
// All HTTP calls for the /environment-overrides resource.

import api from './api'

function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// GET /environment-overrides/
// Returns the full array: [{ id, flag_id, environment_id, value }, ...]
// NOTE: the response contains only IDs, not names. The page fetches flags
// and environments separately and builds a lookup map for display.
// ---------------------------------------------------------------------------
export async function fetchOverrides() {
  try {
    const res = await api.get('/environment-overrides/')
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load environment overrides.'))
  }
}

// ---------------------------------------------------------------------------
// POST /environment-overrides/
// payload: { flag_id: int, environment_id: int, value: bool }
// Returns the created EnvironmentOverrideResponse (201).
// Raises 409 if the (flag_id, environment_id) pair already exists.
// ---------------------------------------------------------------------------
export async function createOverride(payload) {
  try {
    const res = await api.post('/environment-overrides/', payload)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to create override.'))
  }
}

// ---------------------------------------------------------------------------
// PUT /environment-overrides/{id}
// Used for Edit because PATCH only accepts `value` — flag_id and
// environment_id cannot be changed via PATCH. PUT replaces all three fields.
// payload: { flag_id: int, environment_id: int, value: bool }
// ---------------------------------------------------------------------------
export async function replaceOverride(id, payload) {
  try {
    const res = await api.put(`/environment-overrides/${id}`, payload)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to update override.'))
  }
}

// ---------------------------------------------------------------------------
// DELETE /environment-overrides/{id}
// Returns the deleted EnvironmentOverrideResponse.
// ---------------------------------------------------------------------------
export async function deleteOverride(id) {
  try {
    const res = await api.delete(`/environment-overrides/${id}`)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to delete override.'))
  }
}
