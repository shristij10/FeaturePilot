// featureFlagService.js
// All HTTP calls for the /feature-flags resource.
// Pages import from here — never from api.js directly.

import api from './api'

function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// GET /feature-flags/
// Returns the full array of FeatureFlagResponse objects.
// ---------------------------------------------------------------------------
export async function fetchFeatureFlags() {
  try {
    const res = await api.get('/feature-flags/')
    return res.data   // [{ id, key, description, type, default_value, enabled, owner_team, created_at }]
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load feature flags.'))
  }
}

// ---------------------------------------------------------------------------
// POST /feature-flags/
// payload: { key, type, default_value, enabled, description?, owner_team? }
// Returns the created FeatureFlagResponse (201).
// ---------------------------------------------------------------------------
export async function createFeatureFlag(payload) {
  try {
    const res = await api.post('/feature-flags/', payload)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to create feature flag.'))
  }
}

// ---------------------------------------------------------------------------
// PATCH /feature-flags/{id}
// Uses PATCH — only the fields that changed are sent.
// The backend leaves all omitted fields unchanged.
// payload: any subset of { key, type, default_value, enabled, description, owner_team }
// Returns the updated FeatureFlagResponse.
// ---------------------------------------------------------------------------
export async function updateFeatureFlag(id, payload) {
  try {
    const res = await api.patch(`/feature-flags/${id}`, payload)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to update feature flag.'))
  }
}

// ---------------------------------------------------------------------------
// DELETE /feature-flags/{id}
// Returns the deleted FeatureFlagResponse (backend echoes it back).
// ---------------------------------------------------------------------------
export async function deleteFeatureFlag(id) {
  try {
    const res = await api.delete(`/feature-flags/${id}`)
    return res.data
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to delete feature flag.'))
  }
}
