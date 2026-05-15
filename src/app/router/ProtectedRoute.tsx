import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, authInitializing } = useAuth()
  const location = useLocation()

  if (authInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm font-medium text-[#64748b]">
        Loading your account...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <Outlet />
}
