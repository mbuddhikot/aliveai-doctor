import type { ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { CountrySelect } from './CountrySelect'
import type { Country } from '../../lib/countries'

type PhoneNumberFieldProps = {
  label?: string
  country: Country
  onCountryChange: (country: Country) => void
  error?: string
  disabled?: boolean
  inputProps: ComponentPropsWithoutRef<'input'>
}

export function PhoneNumberField({
  label = 'Phone number',
  country,
  onCountryChange,
  error,
  disabled,
  inputProps,
}: PhoneNumberFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-black">{label}</label>
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
          type="tel"
          autoComplete="tel"
          placeholder="1234567890"
          disabled={disabled}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-black outline-none placeholder:text-[#878787] disabled:cursor-not-allowed"
          {...inputProps}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
