import axios, { AxiosError } from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { readTokenFromStorage } from '../features/auth/utils/storage'

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://aliveai-backend-api-927940582634.us-central1.run.app'

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readTokenFromStorage()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Default Content-Type is application/json; FormData must set its own boundary.
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
  }

  return config
})

type ValidationErrorItem = {
  msg?: string
  loc?: (string | number)[]
  type?: string
}

type ApiErrorBody = {
  message?: string
  detail?: string | ValidationErrorItem[]
  error?: string
}

function formatValidationErrors(detail: ValidationErrorItem[]): string | null {
  const messages = detail
    .map((item) => {
      if (!item || typeof item.msg !== 'string') return null
      const path = Array.isArray(item.loc)
        ? item.loc.filter((part) => part !== 'body').join('.')
        : ''
      return path ? `${path}: ${item.msg}` : item.msg
    })
    .filter((msg): msg is string => Boolean(msg))

  if (messages.length === 0) return null
  return messages.join(' · ')
}

/** Resolves the underlying Axios error when APIs wrap errors in `Error` + `cause`. */
export function getAxiosError(err: unknown): AxiosError | null {
  if (axios.isAxiosError(err)) return err
  if (err instanceof Error && axios.isAxiosError(err.cause)) {
    return err.cause
  }
  return null
}

function messageFromResponseBody(body: unknown): string | null {
  if (typeof body === 'string' && body.trim()) {
    return body.trim()
  }
  if (!body || typeof body !== 'object') return null

  const record = body as ApiErrorBody
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message
  }
  if (typeof record.detail === 'string' && record.detail.trim()) {
    if (record.detail.includes('multipart/form-data')) {
      return 'Document upload failed. Please try again.'
    }
    return record.detail
  }
  if (Array.isArray(record.detail) && record.detail.length > 0) {
    const formatted = formatValidationErrors(record.detail)
    if (formatted) return formatted
    const first = record.detail[0]
    if (first && typeof first.msg === 'string') return first.msg
  }
  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error
  }
  return null
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const axErr = getAxiosError(err)

  if (axErr) {
    const status = axErr.response?.status

    if (!axErr.response) {
      if (axErr.code === 'ECONNABORTED') {
        return 'Request timed out. Check your connection and try again.'
      }
      return 'Cannot reach the API server. It may be down, starting up, or blocked by the network. Try again in a minute.'
    }

    if (status === 401) {
      return 'Your session expired. Please sign in again.'
    }

    if (status === 403) {
      return 'You do not have permission to perform this action.'
    }

    if (status === 422) {
      const bodyMessage = messageFromResponseBody(axErr.response.data)
      return (
        bodyMessage ||
        'The request was invalid. Check required fields and try again.'
      )
    }

    if (status === 503 || status === 502 || status === 504) {
      return 'The API server is temporarily unavailable. Please try again in a minute.'
    }

    if (status === 500) {
      const bodyMessage = messageFromResponseBody(axErr.response.data)
      return (
        bodyMessage ||
        'The API server returned an internal error (500). This is a backend issue — try again later or contact support.'
      )
    }

    const bodyMessage = messageFromResponseBody(axErr.response.data)
    if (bodyMessage) return bodyMessage

    if (axErr.message) return axErr.message
  }

  if (err instanceof Error && err.message) return err.message

  return fallback
}
