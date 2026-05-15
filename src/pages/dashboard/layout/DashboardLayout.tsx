import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { DashboardTopbar } from './DashboardTopbar'

function titleFromPath(pathname: string): string {
  if (pathname.startsWith('/dashboard/calendar')) return 'Calendar'
  if (pathname.startsWith('/dashboard/patient-records')) return 'Patient Records'
  if (pathname.startsWith('/dashboard/availability')) return 'My Availability'
  if (pathname.startsWith('/dashboard/profile')) return 'Profile'
  return 'Dashboard'
}

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const title = useMemo(
    () => titleFromPath(location.pathname),
    [location.pathname],
  )

  const displayName = user?.name || user?.email || 'Doctor'

  return (
    <div className="min-h-screen bg-[#f4f4f8] text-[#161b26]">
      <div className="flex min-h-screen overflow-hidden bg-[#f7f7fb]">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative h-full w-[280px] bg-white shadow-xl">
              <Sidebar />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            title={title}
            name={displayName}
            avatarUrl={user?.avatar_url}
            onOpenSidebar={() => setSidebarOpen(true)}
            onBack={() => navigate(-1)}
            onSignOut={() => {
              signOut()
              navigate('/sign-in', { replace: true })
            }}
          />

          <main className="min-w-0 flex-1 overflow-auto px-4 py-5 md:px-9 md:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
