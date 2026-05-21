import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthShell } from '../components/AuthShell'
import { SocialAuthRow } from '../components/SocialAuthRow'
import { AuthAlert } from '../components/AuthAlert'
import { AuthFormField } from '../components/AuthFormField'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { resolvePostAuthPath } from '../../../features/auth/utils/postAuthPath'
import {
  signInSchema,
  type SignInFormValues,
} from '../../../features/auth/lib/authSchemas'
import type { SignInPayload } from '../../../features/auth/types'
import logoImg from '../../../assets/logo.png'

type AuthLocationState = { from?: string; passwordReset?: boolean }

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    user,
    isAuthenticated,
    signIn,
    authLoading,
    authError,
    resetAuthError,
  } = useAuth()

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
    resolver: zodResolver(signInSchema),
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

  const rootError = errors.root?.message || authError?.message

  return (
    <AuthShell onClose={() => navigate('/')}>
      <div className="flex flex-col items-center text-center">
        <img
          src={logoImg}
          alt="AliveAI Doctor"
          className="h-[72px] w-auto object-contain"
        />
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-black sm:text-5xl">
          Welcome back
        </h1>
        <p className="mt-2 text-base text-[#878787] sm:text-xl">
          Don&apos;t have an account?{' '}
          <Link className="font-medium text-[#8a37ff] underline" to="/sign-up">
            Create one
          </Link>
        </p>
      </div>

      <form
        className="mt-10 space-y-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {rootError && <AuthAlert variant="error" message={rootError} />}

        {passwordReset && !rootError && (
          <AuthAlert
            variant="success"
            message="Your password has been reset. You can sign in now."
          />
        )}

        <AuthFormField
          id="sign-in-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          id="sign-in-password"
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          registration={register('password')}
        />

        <div className="space-y-4">
          <button
            type="submit"
            disabled={authLoading || isSubmitting}
            className="h-12 w-full rounded-[10px] bg-[#8a37ff] text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading || isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-black sm:text-base">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-[#e5e5e5] text-[#8a37ff] focus:ring-[#8a37ff]"
                {...register('remember')}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-[#8a37ff] hover:underline sm:text-base"
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
