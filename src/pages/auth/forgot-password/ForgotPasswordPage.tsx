import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import logoImg from '../../../assets/logo.png'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { forgotPassword, authLoading, resetAuthError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    return () => resetAuthError()
  }, [resetAuthError])

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await forgotPassword({ email: values.email })
      navigate('/reset-password', {
        replace: true,
        state: { email: values.email.trim().toLowerCase() },
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to send reset code'
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
          Forgot password
        </h1>
        <p className="mt-2 text-center text-base text-[#878787]">
          Enter your doctor account email to receive a reset code.
        </p>
      </div>

      <form className="mt-10 space-y-7" onSubmit={handleSubmit(onSubmit)}>
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

        <button
          type="submit"
          disabled={authLoading || isSubmitting}
          className="h-12 w-full rounded-[10px] bg-[#8a37ff] text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {authLoading || isSubmitting ? 'Sending code...' : 'Send reset code'}
        </button>

        <p className="text-center text-sm text-[#878787]">
          Remembered it?{' '}
          <Link to="/sign-in" className="font-medium text-[#8a37ff] underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
