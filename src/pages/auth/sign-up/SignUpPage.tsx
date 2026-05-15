import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import clsx from 'clsx'
import { AuthShell } from '../components/AuthShell'
import { SocialAuthRow } from '../components/SocialAuthRow'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { CountrySelect } from '../../../components/common/CountrySelect'
import {
  DEFAULT_COUNTRY_ISO2,
  findCountryByIso2,
  type Country,
} from '../../../lib/countries'
import logoImg from '../../../assets/logo.png'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required').max(60),
  last_name: z.string().min(1, 'Last name is required').max(60),
  email: z.string().email('Enter a valid email address'),
  mobile_number: z
    .string()
    .min(7, 'Enter a valid phone number')
    .max(20, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignUpFormValues = z.infer<typeof schema>

const FALLBACK_COUNTRY: Country = {
  iso2: DEFAULT_COUNTRY_ISO2,
  name: 'United States',
  dial_code: '+1',
}

export function SignUpPage() {
  const navigate = useNavigate()
  const { isAuthenticated, signUp, authLoading, resetAuthError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const [country, setCountry] = useState<Country>(
    findCountryByIso2(DEFAULT_COUNTRY_ISO2) ?? FALLBACK_COUNTRY,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      mobile_number: '',
      password: '',
    },
  })

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => resetAuthError()
  }, [resetAuthError])

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      // strip the user's leading dial code if they typed it
      const cleanedMobile = values.mobile_number
        .replace(/\s+/g, '')
        .replace(new RegExp(`^\\${country.dial_code}`), '')

      const result = await signUp({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        country_code: country.dial_code,
        country_name: country.name,
        mobile_number: cleanedMobile,
      })

      navigate('/verify-otp', {
        replace: true,
        state: { email: result.email },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to sign up'
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
        <h1 className="mt-4 text-5xl font-bold tracking-[-1px] text-black">
          Hey there
        </h1>
        <p className="mt-2 text-xl text-[#878787]">
          Already know Musaki?{' '}
          <Link className="font-medium text-[#8a37ff] underline" to="/sign-in">
            Log in
          </Link>
        </p>
      </div>

      <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {errors.root && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-black">First name</label>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Steve"
              className={clsx(
                'h-[50px] w-full rounded-[10px] border px-4 text-base text-black outline-none',
                errors.first_name
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-[#b6b6b8] focus:border-[#8a37ff]',
              )}
              {...register('first_name')}
            />
            {errors.first_name && (
              <p className="text-xs text-red-600">{errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-black">Last name</label>
            <input
              type="text"
              autoComplete="family-name"
              placeholder="Madden"
              className={clsx(
                'h-[50px] w-full rounded-[10px] border px-4 text-base text-black outline-none',
                errors.last_name
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-[#b6b6b8] focus:border-[#8a37ff]',
              )}
              {...register('last_name')}
            />
            {errors.last_name && (
              <p className="text-xs text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-black">Email address</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="steve.madden@gmail.com"
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
          <label className="text-sm text-black">Phone Number</label>
          <div
            className={clsx(
              'flex h-[50px] w-full items-center rounded-[10px] border px-4',
              errors.mobile_number
                ? 'border-red-300 focus-within:border-red-400'
                : 'border-[#b6b6b8] focus-within:border-[#8a37ff]',
            )}
          >
            <CountrySelect value={country} onChange={setCountry} />
            <span className="mx-3 h-7 w-px bg-[#b6b6b8]" />
            <input
              type="tel"
              autoComplete="tel"
              placeholder="1234567890"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-black outline-none placeholder:text-black"
              {...register('mobile_number')}
            />
          </div>
          {errors.mobile_number && (
            <p className="text-xs text-red-600">
              {errors.mobile_number.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-black">Your password</label>
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
              autoComplete="new-password"
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
            {authLoading || isSubmitting ? 'Signing up...' : 'Sign Up'}
          </button>
        </div>

        <SocialAuthRow mode="sign-up" />
      </form>
    </AuthShell>
  )
}
