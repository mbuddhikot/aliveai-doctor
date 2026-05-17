import type { ReactNode } from 'react'
import {
  FiChevronDown,
  FiChevronLeft,
  FiHelpCircle,
  FiLogOut,
  FiMenu,
  FiUser,
  FiZap,
} from 'react-icons/fi'

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[#dfe3ea] bg-white text-black transition hover:bg-[#f8fafc] md:h-[52px] md:w-[52px]"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function DashboardTopbar({
  name,
  avatarUrl,
  title = 'Dashboard',
  onBack,
  onSignOut,
  onOpenSidebar,
}: {
  name: string
  avatarUrl?: string
  title?: string
  onBack: () => void
  onSignOut: () => void
  onOpenSidebar: () => void
}) {
  return (
    <header className="flex min-h-[76px] shrink-0 items-center justify-between border-b border-[#dfe3ea] bg-white px-4 md:h-20 md:px-9">
      <div className="flex items-center gap-4 md:gap-7">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe3ea] bg-white text-black shadow-sm transition hover:bg-[#f8fafc] md:hidden"
          aria-label="Open sidebar"
          onClick={onOpenSidebar}
        >
          <FiMenu className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="hidden h-7 w-7 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-black shadow-sm transition hover:bg-[#f8fafc] md:inline-flex"
          aria-label="Back"
          onClick={onBack}
        >
          <FiChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-semibold text-black md:text-3xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-8">
        <button className="hidden h-[52px] items-center gap-3 rounded-full bg-gradient-to-r from-[#8a37ff] to-[#9b1fa7] px-8 text-xl font-semibold text-white shadow-[0_8px_20px_rgba(138,55,255,0.2)] transition hover:brightness-105 md:inline-flex">
          <FiZap className="h-6 w-6" />
          Upgrade
        </button>
        <IconButton label="Help">
          <FiHelpCircle className="h-5 w-5 md:h-6 md:w-6" />
        </IconButton>

        <div className="hidden items-center gap-3 md:flex">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-[52px] w-[52px] rounded-full object-cover"
            />
          ) : (
            <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-[#f8d7c7] to-[#4f9bbd] text-white">
              <FiUser className="h-7 w-7" />
            </span>
          )}
          <span className="max-w-[180px] truncate text-xl font-semibold text-[#111827]">
            {name}
          </span>
          <button type="button" aria-label="Open profile menu">
            <FiChevronDown className="h-5 w-5 text-black" />
          </button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe3ea] bg-white text-[#64748b] transition hover:bg-[#f8fafc]"
          aria-label="Log out"
          onClick={onSignOut}
        >
          <FiLogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
