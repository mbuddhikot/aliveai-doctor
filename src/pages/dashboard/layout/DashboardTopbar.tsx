import type { ReactNode } from 'react'
import { FiChevronDown, FiHelpCircle, FiMenu } from 'react-icons/fi'
import { UserAvatar } from '../../../components/common/UserAvatar'

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
  onOpenSidebar,
}: {
  name: string
  avatarUrl?: string
  title?: string
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

        <h1 className="text-xl font-semibold text-black md:text-3xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-8">
        <IconButton label="Help">
          <FiHelpCircle className="h-5 w-5 md:h-6 md:w-6" />
        </IconButton>

        <div className="hidden items-center gap-3 md:flex">
          <UserAvatar name={name} avatarUrl={avatarUrl} />
          <span className="max-w-[180px] truncate text-xl font-semibold text-[#111827]">
            {name}
          </span>
          <button type="button" aria-label="Open profile menu">
            <FiChevronDown className="h-5 w-5 text-black" />
          </button>
        </div>
      </div>
    </header>
  )
}
