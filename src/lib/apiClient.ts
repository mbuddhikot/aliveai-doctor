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

type ApiErrorBody = {
  message?: string
  detail?: string | { msg?: string }[]
  error?: string
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<ApiErrorBody>
    const status = axErr.response?.status

    if (!axErr.response) {
      if (axErr.code === 'ECONNABORTED') {
        return 'Request timed out. Check your connection and try again.'
      }
      return 'Cannot reach the API server. It may be down, starting up, or blocked by the network. Try again in a minute.'
    }

    if (status === 503 || status === 502 || status === 504) {
      return 'The API server is temporarily unavailable. Please try again in a minute.'
    }

    const body = axErr.response?.data

    if (body) {
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message
      }
      if (typeof body.detail === 'string' && body.detail.trim()) {
        if (body.detail.includes('multipart/form-data')) {
          return 'Document upload failed. Please try again.'
        }
        return body.detail
      }
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        const first = body.detail[0]
        if (first && typeof first.msg === 'string') return first.msg
      }
      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error
      }
    }

    if (axErr.message) return axErr.message
  }

  if (err instanceof Error && err.message) return err.message

  return fallback
}
