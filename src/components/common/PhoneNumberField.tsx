import type { ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { CountrySelect } from './CountrySelect'
import type { Country } from '../../lib/countries'

type PhoneNumberFieldProps = {
  id?: string
  label?: string
  country: Country
  onCountryChange: (country: Country) => void
  error?: string
  disabled?: boolean
  inputProps: ComponentPropsWithoutRef<'input'>
}

export function PhoneNumberField({
  id = 'phone-number',
  label = 'Phone number',
  country,
  onCountryChange,
  error,
  disabled,
  inputProps,
}: PhoneNumberFieldProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm text-black">
        {label}
      </label>
      <div
        className={clsx(
          'flex h-[50px] w-full items-center rounded-[10px] border px-4',
          error
            ? 'border-red-300 focus-within:border-red-400'
            : 'border-[#b6b6b8] focus-within:border-[#8a37ff]',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <CountrySelect
          value={country}
          onChange={onCountryChange}
          disabled={disabled}
        />
        <span className="mx-3 h-7 w-px shrink-0 bg-[#b6b6b8]" aria-hidden="true" />
        <input
          id={id}
          type="tel"
          autoComplete="tel"
          placeholder="1234567890"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-black outline-none placeholder:text-[#878787] disabled:cursor-not-allowed"
          {...inputProps}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
