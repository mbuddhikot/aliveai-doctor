import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { FiUser } from 'react-icons/fi'

const FAILED_AVATAR_KEY = 'aliveai-failed-avatar-urls'

function readFailedAvatarUrls(): Set<string> {
  try {
    const raw = sessionStorage.getItem(FAILED_AVATAR_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : [])
  } catch {
    return new Set()
  }
}

function markAvatarUrlFailed(url: string) {
  try {
    const failed = readFailedAvatarUrls()
    failed.add(url)
    sessionStorage.setItem(FAILED_AVATAR_KEY, JSON.stringify([...failed]))
  } catch {
    /* ignore quota / private mode */
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

type UserAvatarProps = {
  name: string
  avatarUrl?: string | null
  className?: string
  iconClassName?: string
}

export function UserAvatar({
  name,
  avatarUrl,
  className = 'h-[52px] w-[52px]',
  iconClassName = 'h-7 w-7',
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)

  const url = avatarUrl?.trim() || ''
  const urlPreviouslyFailed = useMemo(
    () => (url ? readFailedAvatarUrls().has(url) : false),
    [url],
  )

  const showImage = Boolean(url) && !imageFailed && !urlPreviouslyFailed
  const initials = useMemo(() => initialsFromName(name), [name])

  useEffect(() => {
    setImageFailed(false)
  }, [url])

  const handleError = useCallback(() => {
    if (url) markAvatarUrlFailed(url)
    setImageFailed(true)
  }, [url])

  if (showImage) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleError}
        className={clsx('rounded-full object-cover', className)}
      />
    )
  }

  if (initials && initials !== '?') {
    return (
      <span
        className={clsx(
          'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#8a37ff] to-[#9b1fa7] text-sm font-bold text-white',
          className,
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#f8d7c7] to-[#4f9bbd] text-white',
        className,
      )}
      aria-hidden="true"
    >
      <FiUser className={iconClassName} />
    </span>
  )
}
