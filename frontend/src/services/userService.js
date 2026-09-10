// userService.js
// API calls for the /users resource.

import api from './api'

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------
// Sends PATCH /users/profile with { user_id, username }.
// Returns the updated UserResponse: { id, username, email, created_at }.
//
// The endpoint requires user_id because there is no JWT auth yet — the client
// identifies the user from the object stored in localStorage.
//
// Does NOT send department — the User model has no department column.
//
// Error shapes:
//   409 — username already taken  → detail: "Username already exists."
//   404 — user not found          → detail: "User not found."
//   422 — validation failure      → pydantic detail array
// ---------------------------------------------------------------------------
export async function updateProfile({ user_id, username }) {
  try {
    const res = await api.patch('/users/profile', { user_id, username })
    return res.data   // UserResponse: { id, username, email, created_at }
  } catch (err) {
    // 409 — surface the backend message directly
    if (err.response?.status === 409) {
      throw new Error(err.response.data?.detail ?? 'Username already exists.')
    }
    // 422 — join pydantic validation messages
    if (err.response?.status === 422) {
      const details = err.response.data?.detail
      if (Array.isArray(details)) {
        throw new Error(details.map(d => d.msg).join(' | '))
      }
    }
    // All other errors
    throw new Error(
      err.response?.data?.detail ?? 'Unable to update profile. Please try again.'
    )
  }
}
