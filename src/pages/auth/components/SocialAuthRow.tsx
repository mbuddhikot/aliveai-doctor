import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FcGoogle } from 'react-icons/fc'
import { getOAuthPublicConfig } from '../../../features/auth/api/authApi'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { resolvePostAuthPath } from '../../../features/auth/utils/postAuthPath'

type SocialAuthMode = 'sign-in' | 'sign-up'

type SocialAuthRowProps = {
  mode?: SocialAuthMode
  redirectTo?: string
}

type GoogleCredentialResponse = {
  credential?: string
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject()
    document.head.appendChild(script)
  })
}

export function SocialAuthRow({
  mode = 'sign-in',
  redirectTo = '/dashboard',
}: SocialAuthRowProps) {
  const navigate = useNavigate()
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const { signInWithGoogle, authLoading } = useAuth()
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleClientId, setGoogleClientId] = useState(
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '',
  )
  const label =
    mode === 'sign-up' ? 'Continue with Google' : 'Log in with Google'

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const credential = response.credential
      if (!credential) {
        setGoogleError('Google did not return a sign-in token.')
        return
      }

      try {
        setGoogleError(null)
        const account = await signInWithGoogle(credential)
        navigate(resolvePostAuthPath(account, redirectTo), { replace: true })
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unable to sign in with Google'
        setGoogleError(message)
      }
    },
    [navigate, redirectTo, signInWithGoogle],
  )

  useEffect(() => {
    if (googleClientId) return

    let cancelled = false

    getOAuthPublicConfig()
      .then((config) => {
        if (!cancelled && config.google_client_id) {
          setGoogleClientId(config.google_client_id)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleError('Google sign-in is not configured.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [googleClientId])

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return

    let cancelled = false

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
          return
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredential,
        })
        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          shape: 'rectangular',
          theme: 'outline',
          size: 'large',
          text: mode === 'sign-up' ? 'signup_with' : 'signin_with',
          width: googleButtonRef.current.clientWidth,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleError('Google sign-in could not be loaded.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [googleClientId, handleCredential, mode])

  return (
    <div className="mt-7">
      <div className="relative flex items-center py-1">
        <span className="h-px flex-1 bg-[#e6e8ee]" />
        <span className="px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9aa1ad]">
          Google
        </span>
        <span className="h-px flex-1 bg-[#e6e8ee]" />
      </div>

      <div className="relative mt-4 h-12 overflow-hidden rounded-[10px] border border-[#d8dde6] bg-white shadow-[0_1px_8px_rgba(15,23,42,0.06)] transition hover:border-[#b7c0cc] hover:bg-[#fbfcfe]">
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 text-base font-semibold text-[#202124]">
          <FcGoogle className="h-[22px] w-[22px]" />
          {label}
        </div>
        {googleClientId ? (
          <div
            ref={googleButtonRef}
            className="absolute inset-0 z-20 opacity-0 [&>div]:h-full [&>div]:w-full"
          />
        ) : (
          <button
            type="button"
            disabled
            className="absolute inset-0 z-20 cursor-not-allowed opacity-0"
            aria-label="Google sign-in is loading"
          />
        )}
        {authLoading && googleClientId ? (
          <span className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 text-sm font-medium text-[#64748b]">
            Connecting...
          </span>
        ) : null}
      </div>
      {googleError && (
        <div className="mt-3 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-center text-sm leading-5 text-red-700">
          {googleError}
        </div>
      )}
    </div>
  )
}
