// environmentService.js
// All HTTP calls for the /environments resource live here.
// Pages import from this file — they never use `api` directly.

import api from './api'

// Shared error extractor — reads FastAPI's `detail` field if present,
// otherwise falls back to a generic message.
function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// GET /environments/
// Returns the full array of EnvironmentResponse objects.
// ---------------------------------------------------------------------------
export async function fetchEnvironments() {
  try {
    const res = await api.get('/environments/')
    return res.data          // array: [{ id, name, description, created_at }, ...]
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load environments.'))
  }
}

// ---------------------------------------------------------------------------
// POST /environments/
// payload: { name: string, description?: string }
// Returns the newly created EnvironmentResponse.
// ---------------------------------------------------------------------------
export async function createEnvironment(payload) {
  try {
    const res = await api.post('/environments/', payload)
    return res.data          // { id, name, description, created_at }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to create environment.'))
  }
}

// ---------------------------------------------------------------------------
// PATCH /environments/{id}
// Uses PATCH (partial update) — only sends the fields the user actually
// changed. The backend leaves omitted fields unchanged.
// payload: { name?: string, description?: string }
// Returns the updated EnvironmentResponse.
// ---------------------------------------------------------------------------
export async function updateEnvironment(id, payload) {
  try {
    const res = await api.patch(`/environments/${id}`, payload)
    return res.data          // { id, name, description, created_at }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to update environment.'))
  }
}

// ---------------------------------------------------------------------------
// DELETE /environments/{id}
// Returns the deleted EnvironmentResponse (backend echoes it back).
// ---------------------------------------------------------------------------
export async function deleteEnvironment(id) {
  try {
    const res = await api.delete(`/environments/${id}`)
    return res.data          // the deleted environment object
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to delete environment.'))
  }
}
