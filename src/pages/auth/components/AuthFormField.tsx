import type { InputHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type AuthFormFieldProps = {
  id: string
  label: string
  error?: string
  hint?: string
  children?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

const inputBase =
  'h-[50px] w-full rounded-[10px] border px-4 text-base text-black outline-none transition placeholder:text-[#9aa1ad]'

export function AuthFormField({
  id,
  label,
  error,
  hint,
  children,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint && !error ? `${id}-hint` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm text-black">
        {label}
      </label>
      {children ?? (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={clsx(
            inputBase,
            error
              ? 'border-red-300 focus:border-red-400'
              : 'border-[#b6b6b8] focus:border-[#8a37ff]',
            className,
          )}
          {...inputProps}
        />
      )}
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

export { inputBase }
