import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import clsx from 'clsx'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import logoImg from '../../../assets/logo.png'

const schema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    otp: z.string().trim().min(4, 'Enter the reset code').max(12),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type ResetPasswordFormValues = z.infer<typeof schema>
type LocationState = { email?: string }

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { resetPassword, authLoading, resetAuthError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const emailFromState = useMemo(() => {
    const s = location.state as LocationState | null
    return typeof s?.email === 'string' ? s.email : ''
  }, [location.state])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailFromState,
      otp: '',
      new_password: '',
      confirm_password: '',
    },
  })

  useEffect(() => {
    return () => resetAuthError()
  }, [resetAuthError])

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await resetPassword({
        email: values.email,
        otp: values.otp.trim(),
        new_password: values.new_password,
      })
      navigate('/sign-in', {
        replace: true,
        state: { passwordReset: true },
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to reset password'
      setError('root', { message })
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
        <h1 className="mt-5 text-center text-4xl font-bold text-black">
          Reset password
        </h1>
        <p className="mt-2 text-center text-base text-[#878787]">
          Enter the code from your email and choose a new password.
        </p>
      </div>

      <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {errors.root && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-black">Email address</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="doctor@example.com"
            className={clsx(
              'h-[50px] w-full rounded-[10px] border px-4 text-base text-black outline-none placeholder:text-black',
              errors.email
                ? 'border-red-300 focus:border-red-400'
                : 'border-[#b6b6b8] focus:border-[#8a37ff]',
            )}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-black">Reset code</label>
          <input
            type="text"
            autoComplete="one-time-code"
            placeholder="Enter code"
            className={clsx(
              'h-[50px] w-full rounded-[10px] border px-4 text-base text-black outline-none placeholder:text-black',
              errors.otp
                ? 'border-red-300 focus:border-red-400'
                : 'border-[#b6b6b8] focus:border-[#8a37ff]',
            )}
            {...register('otp')}
          />
          {errors.otp && (
            <p className="text-xs text-red-600">{errors.otp.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-black">New password</label>
          <div
            className={clsx(
              'flex h-[50px] items-center rounded-[10px] border px-4',
              errors.new_password
                ? 'border-red-300 focus-within:border-red-400'
                : 'border-[#b6b6b8] focus-within:border-[#8a37ff]',
            )}
          >
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••••"
              className="h-full w-full bg-transparent text-base tracking-[6px] text-black outline-none placeholder:text-black"
              {...register('new_password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-black hover:bg-slate-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <FiEyeOff className="h-4 w-4" />
              ) : (
                <FiEye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-xs text-red-600">
              {errors.new_password.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-black">Confirm password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••••"
            className={clsx(
              'h-[50px] w-full rounded-[10px] border px-4 text-base tracking-[6px] text-black outline-none placeholder:text-black',
              errors.confirm_password
                ? 'border-red-300 focus:border-red-400'
                : 'border-[#b6b6b8] focus:border-[#8a37ff]',
            )}
            {...register('confirm_password')}
          />
          {errors.confirm_password && (
            <p className="text-xs text-red-600">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={authLoading || isSubmitting}
          className="h-12 w-full rounded-[10px] bg-[#8a37ff] text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {authLoading || isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>

        <p className="text-center text-sm text-[#878787]">
          Need another code?{' '}
          <Link
            to="/forgot-password"
            className="font-medium text-[#8a37ff] underline"
          >
            Send again
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
