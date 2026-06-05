import { toast } from 'sonner'
import { extractApiErrorMessage } from './apiClient'

export { toast }

export function toastSuccess(message: string): void {
  toast.success(message)
}

export function toastError(err: unknown, fallback: string): void {
  toast.error(extractApiErrorMessage(err, fallback))
}
