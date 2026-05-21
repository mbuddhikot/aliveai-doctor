import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import clsx from 'clsx'
import { inputBase } from './AuthFormField'
import type { SignUpFormValues } from '../../../features/auth/lib/authSchemas'
import { DOCTOR_TITLE } from '../../../features/auth/utils/doctorName'

type DoctorNameFieldsProps = {
  register: UseFormRegister<SignUpFormValues>
  errors: FieldErrors<SignUpFormValues>
}

export function DoctorNameFields({ register, errors }: DoctorNameFieldsProps) {
  const firstError = errors.first_name?.message
  const lastError = errors.last_name?.message

  return (
    <div className="space-y-1">
      <span className="text-sm text-black">Your name</span>
      <p className="text-xs text-[#64748b]">
        {DOCTOR_TITLE} is included for every doctor account
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span
          className="flex h-[50px] shrink-0 items-center justify-center rounded-[10px] border border-[#b6b6b8] bg-[#fafafa] px-4 text-base font-semibold text-[#8a37ff] sm:min-w-[72px]"
          aria-hidden
        >
          {DOCTOR_TITLE}
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="sign-up-first-name" className="sr-only">
              First name
            </label>
            <input
              id="sign-up-first-name"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              aria-invalid={Boolean(firstError)}
              className={clsx(
                inputBase,
                firstError
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-[#b6b6b8] focus:border-[#8a37ff]',
              )}
              {...register('first_name')}
            />
            {firstError && (
              <p role="alert" className="text-xs text-red-600">
                {firstError}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="sign-up-last-name" className="sr-only">
              Last name
            </label>
            <input
              id="sign-up-last-name"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              aria-invalid={Boolean(lastError)}
              className={clsx(
                inputBase,
                lastError
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-[#b6b6b8] focus:border-[#8a37ff]',
              )}
              {...register('last_name')}
            />
            {lastError && (
              <p role="alert" className="text-xs text-red-600">
                {lastError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
