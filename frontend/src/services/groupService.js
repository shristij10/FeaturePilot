// groupService.js
// All HTTP calls for the /groups resource.
// Pages import from this file — they never use `api` directly.

import api from './api'

// Shared error extractor — reads FastAPI's `detail` field if present,
// otherwise falls back to a generic message.
function extractMessage(err, fallback) {
  return err.response?.data?.detail ?? fallback
}

// ---------------------------------------------------------------------------
// POST /groups/
// payload: { group_name: string }
// Returns the newly created UserGroupResponse: { id, group_name }
// Raises 409 if a group with the same group_name already exists.
// ---------------------------------------------------------------------------
export async function createGroup(payload) {
  try {
    const res = await api.post('/groups/', payload)
    return res.data   // { id, group_name }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to create group.'))
  }
}

// ---------------------------------------------------------------------------
// GET /groups/
// Returns the full array of UserGroupResponse objects ordered by id.
// ---------------------------------------------------------------------------
export async function fetchGroups() {
  try {
    const res = await api.get('/groups/')
    return res.data   // [{ id, group_name }, ...]
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load groups.'))
  }
}

// ---------------------------------------------------------------------------
// GET /groups/{groupId}/users
// Returns the list of UserResponse objects belonging to the group,
// ordered by username.
// Raises 404 if the group does not exist.
// ---------------------------------------------------------------------------
export async function fetchGroupMembers(groupId) {
  try {
    const res = await api.get(`/groups/${groupId}/users`)
    return res.data   // [{ id, username, email, created_at }, ...]
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to load group members.'))
  }
}

// ---------------------------------------------------------------------------
// POST /groups/{groupId}/users
// payload: { username: string }
// Assigns an existing user to the group.
// Returns the updated UserResponse for the added user.
// Raises 404 if the group or user does not exist.
// ---------------------------------------------------------------------------
export async function addUserToGroup(groupId, payload) {
  try {
    const res = await api.post(`/groups/${groupId}/users`, payload)
    return res.data   // { id, username, email, created_at }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to add user to group.'))
  }
}

// ---------------------------------------------------------------------------
// DELETE /groups/{groupId}/users/{userId}
// Removes a user from the group by clearing their group assignment.
// Returns the updated UserResponse with group_id set to null.
// Raises 404 if the group or user does not exist.
// Raises 409 if the user is not currently a member of this group.
// ---------------------------------------------------------------------------
export async function removeUserFromGroup(groupId, userId) {
  try {
    const res = await api.delete(`/groups/${groupId}/users/${userId}`)
    return res.data   // { id, username, email, created_at }
  } catch (err) {
    throw new Error(extractMessage(err, 'Failed to remove user from group.'))
  }
}

export async function deleteGroup(groupId) {
  try {
    const { data } = await api.delete(`/groups/${groupId}`)
    return data
  } catch (err) {
    throw new Error(extractMessage(err))
  }
}