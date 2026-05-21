import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { AuthShell } from '../components/AuthShell'
import { SocialAuthRow } from '../components/SocialAuthRow'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { resolvePostAuthPath } from '../../../features/auth/utils/postAuthPath'
import clsx from 'clsx'
import type { SignInPayload } from '../../../features/auth/types'
import logoImg from '../../../assets/logo.png'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
})

type SignInFormValues = z.infer<typeof schema>
type AuthLocationState = { from?: string; passwordReset?: boolean }

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    user,
    isAuthenticated,
    signIn,
    signInDemo,
    authLoading,
    authError,
    resetAuthError,
  } = useAuth()

  const [showPassword, setShowPassword] = useState(false)

  const from = useMemo(() => {
    const s = location.state as AuthLocationState | null
    return s && typeof s.from === 'string' ? s.from : '/dashboard'
  }, [location.state])

  const passwordReset = useMemo(() => {
    const s = location.state as AuthLocationState | null
    return Boolean(s?.passwordReset)
  }, [location.state])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignInFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    },
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(resolvePostAuthPath(user, from), { replace: true })
    }
  }, [from, isAuthenticated, navigate, user])

  useEffect(() => {
    return () => resetAuthError()
  }, [resetAuthError])

  const onSubmit = async (values: SignInFormValues) => {
    try {
      const account = await signIn(values as SignInPayload)
      navigate(resolvePostAuthPath(account, from), { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to sign in'
      setError('root', { message })
    }
  }

  const onDemoLogin = () => {
    // TODO: remove this once a real demo account exists on the backend.
    try {
      signInDemo()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to start demo'
      setError('root', { message })
    }
  }

  return (
    <AuthShell onClose={() => navigate('/')}>
      <div className="flex flex-col items-center">
        <img src={logoImg} alt="AliveAI Doctor" className="h-[72px] w-auto object-contain" />
        <h1 className="mt-5 text-5xl font-bold tracking-[-1px] text-black">
          Welcome back
        </h1>
        <p className="mt-2 text-xl text-[#878787]">
          New to Musaki?{' '}
          <Link className="font-medium text-[#8a37ff] underline" to="/sign-up">
            Sign up
          </Link>
        </p>
      </div>

      <form className="mt-10 space-y-9" onSubmit={handleSubmit(onSubmit)}>
        {(authError || errors.root) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root?.message || authError?.message || 'Unable to sign in'}
          </div>
        )}

        {passwordReset && !errors.root && !authError && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Your password has been reset. You can log in now.
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-black">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email address"
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
          <label className="text-sm text-black">
            Your password
          </label>
          <div
            className={clsx(
              'flex h-[50px] items-center rounded-[10px] border px-4',
              errors.password
                ? 'border-red-300 focus-within:border-red-400'
                : 'border-[#b6b6b8] focus-within:border-[#8a37ff]',
            )}
          >
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••"
              className="h-full w-full bg-transparent text-base tracking-[6px] text-black outline-none placeholder:text-black"
              {...register('password')}
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
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-4 pt-1">
          <button
            type="submit"
            disabled={authLoading || isSubmitting}
            className="h-12 w-full rounded-[10px] bg-[#8a37ff] text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading || isSubmitting ? 'Logging in...' : 'Log in'}
          </button>

          <button
            type="button"
            disabled={authLoading || isSubmitting}
            onClick={onDemoLogin}
            className="h-12 w-full rounded-[10px] border border-[#8a37ff] bg-white text-base font-bold text-[#8a37ff] transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Demo login
          </button>

          <div className="flex items-center justify-between">
          <label className="flex items-center gap-[15px] text-base text-black">
            <input
              type="checkbox"
              className="h-6 w-6 rounded border-[#e5e5e5] text-[#8a37ff] focus:ring-[#8a37ff]"
              {...register('remember')}
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-base font-medium text-[#8a37ff] hover:underline"
          >
            Forgot password?
          </Link>
          </div>
        </div>

        <SocialAuthRow mode="sign-in" redirectTo={from} />
      </form>
    </AuthShell>
  )
}
