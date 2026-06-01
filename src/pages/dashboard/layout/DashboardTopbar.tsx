import { FiMenu } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { UserAvatar } from '../../../components/common/UserAvatar'

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
  const navigate = useNavigate()

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

      <button
        type="button"
        className="group hidden cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors duration-150 hover:border-[#e9d5ff] hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a37ff] md:flex"
        aria-label="Go to profile"
        onClick={() => navigate('/dashboard/profile')}
      >
        <UserAvatar name={name} avatarUrl={avatarUrl} />
        <span className="max-w-[180px] truncate text-xl font-semibold text-[#111827] underline-offset-4 transition-colors duration-150 group-hover:text-[#8a37ff] group-hover:underline">
          {name}
        </span>
      </button>
    </header>
  )
}
