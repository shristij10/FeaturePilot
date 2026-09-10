// flagEvaluationService.js
// HTTP call for POST /flags/evaluate.

import api from './api'
import { getStoredUser } from './authService'

// ---------------------------------------------------------------------------
// evaluateFlag
// ---------------------------------------------------------------------------
// payload: {
//   flag_key:      string  — must match ^[a-z0-9_]+$ (comes from flag dropdown)
//   environment:   string  — display name of the environment (comes from env dropdown)
//   user_id:       string | null — used for targeting and rollout ONLY
//   groups:        string[] | null — used for group targeting ONLY
//   user_context:  object | null — optional JSON object from the textarea
// }
//
// performed_by is resolved here from localStorage (the authenticated UI user)
// and included in the payload so the backend can record the correct actor in
// the audit log. It is separate from user_id: user_id controls who the flag
// is evaluated *for*; performed_by records who *ran* the evaluation.
//
// Returns FlagEvaluationResponse:
//   { flag_key, environment, enabled, value, source, reason, ... }
//
// Throws a plain Error whose message is the backend's `detail` string so the
// page can render it directly.
// ---------------------------------------------------------------------------
export async function evaluateFlag(payload) {
  // Attach the authenticated user as the audit actor.
  // Falls back gracefully when localStorage has no user (should not happen
  // in normal use since the page is behind a protected route).
  const storedUser = getStoredUser()
  const enrichedPayload = {
    ...payload,
    performed_by: storedUser?.username ?? null,
  }

  try {
    const res = await api.post('/flags/evaluate', enrichedPayload)
    return res.data
  } catch (err) {
    // 422 Unprocessable Entity — Pydantic validation failure.
    // FastAPI returns an array of error objects under `detail`.
    // We join their `msg` strings into one readable sentence.
    if (err.response?.status === 422) {
      const details = err.response.data?.detail
      if (Array.isArray(details)) {
        const messages = details.map(d => d.msg).join(' | ')
        throw new Error(`Validation error: ${messages}`)
      }
    }

    // 404 and all other errors — detail is a plain string from FastAPI
    const message = err.response?.data?.detail ?? 'Evaluation failed. Please try again.'
    throw new Error(message)
  }
}
