type AuthAlertProps = {
  variant: 'error' | 'success'
  message: string
}

const styles = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const

export function AuthAlert({ variant, message }: AuthAlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${styles[variant]}`}
    >
      {message}
    </div>
  )
}
