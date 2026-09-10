import { Navigate, Outlet, Routes, Route } from 'react-router-dom'

import DashboardLayout       from './layouts/DashboardLayout'
import { getStoredUser }     from './services/authService'

import Home                  from './pages/Home'
import Login                 from './pages/Login'
import Signup                from './pages/Signup'
import Dashboard             from './pages/Dashboard'
import Profile               from './pages/Profile'
import FeatureFlags          from './pages/FeatureFlags'
import Environments          from './pages/Environments'
import EnvironmentOverrides  from './pages/EnvironmentOverrides'
import FlagEvaluation        from './pages/FlagEvaluation'
import AuditLogs             from './pages/AuditLogs'
import GroupManagement       from './pages/GroupManagement'
import GroupMembers          from './pages/GroupMembers'
import TargetingRules        from './pages/TargetingRules'
import SdkDocumentation      from './pages/SdkDocumentation'
import IntegrationExamples   from './pages/IntegrationExamples'
import NotFound              from './pages/NotFound'

// ---------------------------------------------------------------------------
// ProtectedRoute — redirects to /login when no user session is found.
// Wraps DashboardLayout so every child route is automatically protected.
// ---------------------------------------------------------------------------
function ProtectedRoute() {
  const user = getStoredUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function AppRouter() {
  return (
    <Routes>
      {/* ------------------------------------------------------------------ */}
      {/* Public routes — no layout wrapper                                  */}
      {/* ------------------------------------------------------------------ */}
      <Route path="/"       element={<Home />} />
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* ------------------------------------------------------------------ */}
      {/* Protected routes — ProtectedRoute checks auth, then renders        */}
      {/* DashboardLayout which contains an <Outlet /> for child pages.      */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard"             element={<Dashboard />} />
          <Route path="/profile"               element={<Profile />} />
          <Route path="/environments"          element={<Environments />} />
          <Route path="/feature-flags"         element={<FeatureFlags />} />
          <Route path="/environment-overrides" element={<EnvironmentOverrides />} />
          <Route path="/flag-evaluation"       element={<FlagEvaluation />} />
          <Route path="/audit-logs"            element={<AuditLogs />} />
          <Route path="/groups"                element={<GroupManagement />} />
          <Route path="/group-members"         element={<GroupMembers />} />
          <Route path="/targeting-rules"       element={<TargetingRules />} />
          <Route path="/sdk-docs"              element={<SdkDocumentation />} />
          <Route path="/integration-examples"  element={<IntegrationExamples />} />
        </Route>
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Catch-all                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppRouter
