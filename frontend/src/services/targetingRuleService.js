// targetingRuleService.js
// All HTTP calls for the /targeting-rules resource.
// Pages import from this file — they never use `api` directly.

import api from './api'

// Shared error extractor — reads FastAPI's `detail` field if present,
// otherwise falls back to a generic message.
function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// POST /targeting-rules/
// payload: { flag_id: number, rule_type: "user" | "group", rule_value: string }
// Returns the newly created TargetingRuleResponse:
//   { id, flag_id, rule_type, rule_value }
// Raises 404 if the feature flag does not exist.
// Raises 422 if rule_type is not "user" or "group".
// ---------------------------------------------------------------------------
export async function createTargetingRule(payload) {
  try {
    const res = await api.post('/targeting-rules/', payload)
    return res.data   // { id, flag_id, rule_type, rule_value }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to create targeting rule.'))
  }
}

// ---------------------------------------------------------------------------
// GET /targeting-rules/
// Returns the full array of TargetingRuleResponse objects ordered by id.
// ---------------------------------------------------------------------------
export async function fetchTargetingRules() {
  try {
    const res = await api.get('/targeting-rules/')
    return res.data   // [{ id, flag_id, rule_type, rule_value }, ...]
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load targeting rules.'))
  }
}

// ---------------------------------------------------------------------------
// DELETE /targeting-rules/{ruleId}
// Returns the deleted TargetingRuleResponse (backend echoes it back).
// Raises 404 if the targeting rule does not exist.
// ---------------------------------------------------------------------------
export async function deleteTargetingRule(ruleId) {
  try {
    const res = await api.delete(`/targeting-rules/${ruleId}`)
    return res.data   // { id, flag_id, rule_type, rule_value }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to delete targeting rule.'))
  }
}
