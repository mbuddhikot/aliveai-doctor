export type AuthRole = 'doctor' | 'patient'

export type AuthUser = {
  id: string
  name: string
  email: string
  role?: AuthRole
  first_name?: string
  last_name?: string
  avatar_url?: string
  is_verified?: boolean
  created_at?: string
  login_type?: string
  country_code?: string
  country_name?: string
  mobile_number?: string
  has_password?: boolean
}

export type SignInPayload = {
  email: string
  password: string
  remember?: boolean
}

export type SignUpPayload = {
  email: string
  password: string
  first_name: string
  last_name: string
  country_code: string
  country_name: string
  mobile_number: string
  remember?: boolean
}

export type VerifyOtpPayload = {
  email: string
  otp: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  email: string
  otp: string
  new_password: string
}

export type SignUpResult = {
  email: string
}

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  signIn: (payload: SignInPayload) => Promise<AuthUser>
  signInDemo: () => AuthUser
  signUp: (payload: SignUpPayload) => Promise<SignUpResult>
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>
  signInWithGoogle: (token: string) => Promise<AuthUser>
  refreshAccount: () => Promise<AuthUser | null>
  signOut: () => void
  authLoading: boolean
  authInitializing: boolean
  authError: Error | null
  resetAuthError: () => void
}
