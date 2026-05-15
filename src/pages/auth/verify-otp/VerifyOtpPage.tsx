import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import logoImg from '../../../assets/logo.png'

const OTP_LENGTH = 4

type LocationState = { email?: string }

export function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyOtp, authLoading, resetAuthError } = useAuth()

  const email = useMemo(() => {
    const s = location.state as LocationState | null
    return typeof s?.email === 'string' ? s.email : ''
  }, [location.state])

  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => ''),
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (!email) navigate('/sign-up', { replace: true })
  }, [email, navigate])

  useEffect(() => {
    return () => resetAuthError()
  }, [resetAuthError])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const otpValue = digits.join('')
  const canSubmit = otpValue.length === OTP_LENGTH && !authLoading

  const setDigitAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '').slice(-1)
    setDigitAt(index, value)
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
      setDigitAt(index - 1, '')
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!text) return
    e.preventDefault()
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => text[i] || '')
    setDigits(next)
    const focusIndex = Math.min(text.length, OTP_LENGTH - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  const onSubmit = async () => {
    setErrorMessage(null)
    if (!canSubmit) return

    try {
      await verifyOtp({ email, otp: otpValue })
      navigate('/sign-in', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid or expired OTP'
      setErrorMessage(message)
    }
  }

  return (
    <AuthShell onClose={() => navigate('/')}>
      <div className="flex flex-col items-center">
        <img
          src={logoImg}
          alt="AliveAI Doctor"
          className="h-[72px] w-auto object-contain"
        />
        <h1 className="mt-5 text-4xl font-bold tracking-[-0.5px] text-black">
          Verify your email
        </h1>
        <p className="mt-2 text-center text-base text-[#878787]">
          We sent a {OTP_LENGTH}-digit code to{' '}
          <span className="font-medium text-black">{email || 'your email'}</span>
        </p>
      </div>

      <form
        className="mt-10 space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit()
        }}
      >
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-center gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={clsx(
                'h-[60px] w-[60px] rounded-[12px] border text-center text-2xl font-bold text-black outline-none transition',
                'border-[#b6b6b8] focus:border-[#8a37ff]',
              )}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-[10px] bg-[#8a37ff] text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {authLoading ? 'Verifying...' : 'Verify'}
        </button>

        <p className="text-center text-sm text-[#878787]">
          Entered the wrong email?{' '}
          <Link
            to="/sign-up"
            className="font-medium text-[#8a37ff] underline"
          >
            Go back
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
