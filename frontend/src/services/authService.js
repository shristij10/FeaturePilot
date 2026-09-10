// authService.js
// Centralises all authentication API calls and localStorage management.
// Pages import from here — they never touch `api` or localStorage directly.

import api from './api'

// ---------------------------------------------------------------------------
// localStorage key — one constant so every read/write uses the same string.
// ---------------------------------------------------------------------------
const USER_KEY = 'fms_user'

// ---------------------------------------------------------------------------
// signup
// ---------------------------------------------------------------------------
// Sends POST /auth/signup with { username, email, password }.
// Returns the UserResponse object from the backend on success.
// Throws an Error with a human-readable message on failure so the page can
// show it directly in the UI without extra parsing.
// ---------------------------------------------------------------------------
export async function signup({ username, email, password }) {
  try {
    const response = await api.post('/auth/signup', {
      username,
      email,
      password,
    })

    const user = response.data

    // Save user after successful registration
    localStorage.setItem(USER_KEY, JSON.stringify(user))

    return user
  } catch (err) {
    const message =
      err.response?.data?.detail ??
      'Signup failed. Please try again.'

    throw new Error(message)
  }
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
// Sends POST /auth/login with { email, password }.
// Persists the returned user object to localStorage, then returns it.
// ---------------------------------------------------------------------------
export async function login({ email, password }) {
  try {
    const response = await api.post('/auth/login', { email, password })
    const user = response.data
    // Persist to localStorage so the user stays "logged in" across page
    // refreshes. JSON.stringify because localStorage only stores strings.
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user
  } catch (err) {
    const message =
      err.response?.data?.detail ?? 'Login failed. Please try again.'
    throw new Error(message)
  }
}

// ---------------------------------------------------------------------------
// updateStoredUser
// ---------------------------------------------------------------------------
// Merges updated fields into the stored user object and re-persists it.
// Used by the Profile page to reflect edits without a full re-login.
// ---------------------------------------------------------------------------
export function updateStoredUser(updates) {
  const current = getStoredUser() ?? {}
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...updates }))
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------
// Removes the stored user. Call this from a logout button in the future.
// ---------------------------------------------------------------------------
export function logout() {
  localStorage.removeItem(USER_KEY)
}

// ---------------------------------------------------------------------------
// getStoredUser
// ---------------------------------------------------------------------------
// Returns the parsed user object from localStorage, or null if not present.
// Useful for checking auth state on app startup.
// ---------------------------------------------------------------------------
export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}
