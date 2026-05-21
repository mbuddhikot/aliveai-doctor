import { useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import clsx from 'clsx'

type PasswordFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  autoComplete: 'current-password' | 'new-password'
  registration: UseFormRegisterReturn
}

export function PasswordField({
  id,
  label,
  error,
  hint,
  autoComplete,
  registration,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint && !error ? `${id}-hint` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm text-black">
        {label}
      </label>
      <div
        className={clsx(
          'flex h-[50px] items-center rounded-[10px] border px-4 transition',
          error
            ? 'border-red-300 focus-within:border-red-400'
            : 'border-[#b6b6b8] focus-within:border-[#8a37ff]',
        )}
      >
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          placeholder="••••••••"
          className="h-full w-full bg-transparent text-base text-black outline-none placeholder:text-[#9aa1ad]"
          {...registration}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-black hover:bg-slate-100"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? (
            <FiEyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <FiEye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-[#64748b]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
