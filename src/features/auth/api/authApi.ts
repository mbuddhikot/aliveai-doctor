import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type {
  AuthRole,
  AuthUser,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
  SignUpResult,
  VerifyOtpPayload,
} from '../types'

function normalizeEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase()
}

type RawUser = {
  id?: string | number
  _id?: string
  email?: string
  first_name?: string
  last_name?: string
  name?: string
  role?: AuthRole
  avatar_url?: string
  is_verified?: boolean
  created_at?: string
  login_type?: string
  country_code?: string
  country_name?: string
  mobile_number?: string
  has_password?: boolean
}

type LoginResponseShape = {
  token?: string
  access_token?: string
  accessToken?: string
  refresh_token?: string
  refreshToken?: string
  token_type?: string
  user?: RawUser
  data?: {
    token?: string
    access_token?: string
    accessToken?: string
    refresh_token?: string
    refreshToken?: string
    token_type?: string
    user?: RawUser
  }
}

export type AuthSessionResult = {
  user: AuthUser
  token: string | null
  refreshToken: string | null
}

export type OAuthPublicConfig = {
  google_client_id?: string
  facebook_app_id?: string
}

function extractToken(payload: LoginResponseShape): string | null {
  return (
    payload.token ||
    payload.access_token ||
    payload.accessToken ||
    payload.data?.token ||
    payload.data?.access_token ||
    payload.data?.accessToken ||
    null
  )
}

function extractRefreshToken(payload: LoginResponseShape): string | null {
  return (
    payload.refresh_token ||
    payload.refreshToken ||
    payload.data?.refresh_token ||
    payload.data?.refreshToken ||
    null
  )
}

function extractUser(payload: LoginResponseShape, email: string): AuthUser {
  const raw = payload.user || payload.data?.user
  return mapRawUser(raw, email)
}

function mapRawUser(raw: RawUser | undefined, fallbackEmail = ''): AuthUser {
  const email = normalizeEmail(raw?.email || fallbackEmail)
  const fallbackName = email.split('@')[0] || 'Doctor'

  if (raw) {
    const firstName = raw.first_name?.trim()
    const lastName = raw.last_name?.trim()
    const fullName =
      raw.name ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      fallbackName

    return {
      id: String(raw.id ?? raw._id ?? email),
      email,
      name: fullName,
      role: raw.role,
      first_name: raw.first_name,
      last_name: raw.last_name,
      avatar_url: raw.avatar_url,
      is_verified: raw.is_verified,
      created_at: raw.created_at,
      login_type: raw.login_type,
      country_code: raw.country_code,
      country_name: raw.country_name,
      mobile_number: raw.mobile_number,
      has_password: raw.has_password,
    }
  }

  return {
    id: email,
    email,
    name: fallbackName,
  }
}

function extractLoginResult(
  payload: LoginResponseShape,
  email: string,
): AuthSessionResult {
  const fallbackName = email.split('@')[0] || 'Doctor'

  return {
    token: extractToken(payload),
    refreshToken: extractRefreshToken(payload),
    user: extractUser(payload, email || fallbackName),
  }
}

export async function login(
  payload: SignInPayload & { role: AuthRole },
): Promise<AuthSessionResult> {
  const email = normalizeEmail(payload.email)
  try {
    const { data } = await apiClient.post<LoginResponseShape>(
      '/v1/api/auth/login',
      {
        email,
        password: payload.password,
        role: payload.role,
      },
    )

    return extractLoginResult(data, email)
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, 'Unable to sign in'), {
      cause: err,
    })
  }
}

export async function register(
  payload: SignUpPayload & { role: AuthRole },
): Promise<SignUpResult> {
  const email = normalizeEmail(payload.email)
  try {
    await apiClient.post('/v1/api/auth/register', {
      email,
      password: payload.password,
      role: payload.role,
      first_name: payload.first_name,
      last_name: payload.last_name,
      country_code: payload.country_code,
      country_name: payload.country_name,
      mobile_number: payload.mobile_number,
    })
    return { email }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to create your account'),
      { cause: err },
    )
  }
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<void> {
  const email = normalizeEmail(payload.email)
  try {
    await apiClient.post('/v1/api/auth/register/verify-otp', {
      email,
      otp: payload.otp,
    })
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, 'Invalid or expired OTP'), {
      cause: err,
    })
  }
}

export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<void> {
  const email = normalizeEmail(payload.email)
  try {
    await apiClient.post('/v1/api/auth/forgot-password', { email })
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to send password reset code'),
      { cause: err },
    )
  }
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  const email = normalizeEmail(payload.email)
  try {
    await apiClient.post('/v1/api/auth/reset-password', {
      email,
      otp: payload.otp,
      new_password: payload.new_password,
    })
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to reset your password'),
      { cause: err },
    )
  }
}

export async function googleLogin(
  payload: { token: string; role: AuthRole },
): Promise<AuthSessionResult> {
  try {
    const { data } = await apiClient.post<LoginResponseShape>(
      '/v1/api/auth/google-login',
      {
        token: payload.token,
        role: payload.role,
      },
    )

    return extractLoginResult(data, '')
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, 'Unable to sign in with Google'), {
      cause: err,
    })
  }
}

export async function getOAuthPublicConfig(): Promise<OAuthPublicConfig> {
  try {
    const { data } = await apiClient.get<OAuthPublicConfig>(
      '/v1/api/auth/oauth-public-config',
    )
    return data
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load OAuth configuration'),
      { cause: err },
    )
  }
}

export async function getAccount(): Promise<AuthUser> {
  try {
    const { data } = await apiClient.get<RawUser | { data?: RawUser; user?: RawUser }>(
      '/v1/api/auth/account',
    )
    const raw = 'email' in data ? data : data.user || data.data
    return mapRawUser(raw)
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, 'Unable to load account'), {
      cause: err,
    })
  }
}
