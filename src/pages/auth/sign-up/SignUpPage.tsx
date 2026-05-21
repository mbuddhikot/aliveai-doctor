import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { AuthShell } from '../components/AuthShell'
import { SocialAuthRow } from '../components/SocialAuthRow'
import { AuthAlert } from '../components/AuthAlert'
import { AuthFormField } from '../components/AuthFormField'
import { DoctorNameFields } from '../components/DoctorNameFields'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { resolvePostAuthPath } from '../../../features/auth/utils/postAuthPath'
import {
  PASSWORD_REQUIREMENTS_HINT,
  signUpSchema,
  type SignUpFormValues,
} from '../../../features/auth/lib/authSchemas'
import { PhoneNumberField } from '../../../components/common/PhoneNumberField'
import { cleanLocalPhoneNumber } from '../../../lib/phone'
import {
  DEFAULT_COUNTRY_ISO2,
  findCountryByIso2,
  type Country,
} from '../../../lib/countries'
import logoImg from '../../../assets/logo.png'

const FALLBACK_COUNTRY: Country = {
  iso2: DEFAULT_COUNTRY_ISO2,
  name: 'United States',
  dial_code: '+1',
}

export function SignUpPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, signUp, authLoading, resetAuthError } =
    useAuth()

  const [country, setCountry] = useState<Country>(
    findCountryByIso2(DEFAULT_COUNTRY_ISO2) ?? FALLBACK_COUNTRY,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      mobile_number: '',
      password: '',
      accept_terms: undefined,
    },
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(resolvePostAuthPath(user), { replace: true })
    }
  }, [isAuthenticated, navigate, user])

  useEffect(() => {
    return () => resetAuthError()
  }, [resetAuthError])

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      const cleanedMobile = cleanLocalPhoneNumber(
        values.mobile_number,
        country.dial_code,
      )

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
      <div className="flex flex-col items-center text-center">
        <img
          src={logoImg}
          alt="AliveAI Doctor"
          className="h-[72px] w-auto object-contain"
        />
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-black sm:text-5xl">
          Join AliveAI Doctor
        </h1>
        <p className="mt-2 text-base text-[#878787] sm:text-xl">
          Already have an account?{' '}
          <Link className="font-medium text-[#8a37ff] underline" to="/sign-in">
            Sign in
          </Link>
        </p>
      </div>

      <form
        className="mt-10 space-y-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {errors.root?.message && (
          <AuthAlert variant="error" message={errors.root.message} />
        )}

        <DoctorNameFields register={register} errors={errors} />

        <AuthFormField
          id="sign-up-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <PhoneNumberField
          country={country}
          onCountryChange={setCountry}
          error={errors.mobile_number?.message}
          inputProps={register('mobile_number')}
        />

        <PasswordField
          id="sign-up-password"
          label="Password"
          autoComplete="new-password"
          hint={PASSWORD_REQUIREMENTS_HINT}
          error={errors.password?.message}
          registration={register('password')}
        />

        <div className="space-y-1">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-black">
            <input
              type="checkbox"
              className={clsx(
                'mt-0.5 h-5 w-5 shrink-0 rounded border-[#e5e5e5] text-[#8a37ff] focus:ring-[#8a37ff]',
                errors.accept_terms && 'border-red-300',
              )}
              {...register('accept_terms')}
            />
            <span>
              I agree to the{' '}
              <a
                href="https://aliveai.health/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#8a37ff] underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="https://aliveai.health/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#8a37ff] underline"
              >
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.accept_terms && (
            <p role="alert" className="text-xs text-red-600">
              {errors.accept_terms.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={authLoading || isSubmitting}
          className="h-12 w-full rounded-[10px] bg-[#8a37ff] text-base font-bold text-white transition hover:bg-[#772cf0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {authLoading || isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <SocialAuthRow mode="sign-up" />
      </form>
    </AuthShell>
  )
}
