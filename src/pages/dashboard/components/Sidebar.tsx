import { NavLink } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  FiCalendar,
  FiFileText,
  FiGrid,
  FiMessageSquare,
  FiSettings,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import clsx from 'clsx'
import logoImg from '../../../assets/logo.png'

type NavItem = {
  to: string
  label: string
  icon: IconType
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/dashboard/calendar', label: 'Calendar', icon: FiCalendar },
  { to: '/dashboard/patient-records', label: 'Patient Records', icon: FiFileText },
  { to: '/dashboard/availability', label: 'My Availability', icon: FiCalendar },
  { to: '/dashboard/profile', label: 'Profile', icon: FiUser },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#dfe3ea] bg-white">
      <div className="flex h-[150px] shrink-0 items-center justify-center">
        <img src={logoImg} alt="AliveAI Doctor" className="h-[72px] w-auto object-contain" />
      </div>

      <nav className="min-h-0 flex-1 space-y-[15px] overflow-y-auto px-7">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-[40px] items-center gap-4 rounded-md px-4 text-base font-medium',
                  isActive
                    ? 'bg-[#8a37ff] text-white shadow-[0_8px_20px_rgba(138,55,255,0.2)]'
                    : 'text-[#1f2933] hover:bg-violet-50',
                )
              }
              end={item.to === '/dashboard'}
            >
              <Icon className="h-5 w-5 shrink-0 stroke-[1.9]" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="shrink-0 space-y-[22px] px-10 pb-[54px] text-base font-medium text-[#1f2933]">
        <button type="button" className="flex min-h-8 w-full items-center gap-4 rounded-md hover:text-[#8a37ff]">
          <FiMessageSquare className="h-5 w-5 shrink-0 stroke-[1.9]" />
          <span>Feedback</span>
        </button>
        <button type="button" className="flex min-h-8 w-full items-center gap-4 rounded-md hover:text-[#8a37ff]">
          <FiUsers className="h-5 w-5 shrink-0 stroke-[1.9]" />
          <span>Invite People</span>
        </button>
        <button type="button" className="flex min-h-8 w-full items-center gap-4 rounded-md hover:text-[#8a37ff]">
          <FiSettings className="h-5 w-5 shrink-0 stroke-[1.9]" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
