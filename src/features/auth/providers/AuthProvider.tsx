import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  forgotPassword as forgotPasswordApi,
  getAccount,
  googleLogin as googleLoginApi,
  login as loginApi,
  register as registerApi,
  resetPassword as resetPasswordApi,
  verifyOtp as verifyOtpApi,
} from '../api/authApi'
import {
  clearTokenStorage,
  clearUserStorage,
  readTokenFromStorage,
  readUserFromStorage,
  writeRefreshTokenToStorage,
  writeTokenToStorage,
  writeUserToStorage,
} from '../utils/storage'
import { toastSuccess } from '../../../lib/toast'
import { AuthContext } from '../context'
import type {
  AuthContextValue,
  AuthRole,
  AuthUser,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
  SignUpResult,
  VerifyOtpPayload,
} from '../types'

type AuthProviderProps = {
  children: ReactNode
}

const DEFAULT_ROLE: AuthRole =
  (import.meta.env.VITE_AUTH_ROLE as AuthRole) || 'doctor'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => readUserFromStorage())
  const [authInitializing, setAuthInitializing] = useState(() =>
    Boolean(readTokenFromStorage()),
  )

  const {
    mutateAsync: loginMutateAsync,
    isPending: isLoginPending,
    error: loginError,
    reset: resetLoginMutation,
  } = useMutation({
    mutationFn: loginApi,
  })

  const {
    mutateAsync: registerMutateAsync,
    isPending: isRegisterPending,
    error: registerError,
    reset: resetRegisterMutation,
  } = useMutation({
    mutationFn: registerApi,
  })

  const {
    mutateAsync: verifyOtpMutateAsync,
    isPending: isVerifyOtpPending,
    error: verifyOtpError,
    reset: resetVerifyOtpMutation,
  } = useMutation({
    mutationFn: verifyOtpApi,
  })

  const {
    mutateAsync: forgotPasswordMutateAsync,
    isPending: isForgotPasswordPending,
    error: forgotPasswordError,
    reset: resetForgotPasswordMutation,
  } = useMutation({
    mutationFn: forgotPasswordApi,
  })

  const {
    mutateAsync: resetPasswordMutateAsync,
    isPending: isResetPasswordPending,
    error: resetPasswordError,
    reset: resetPasswordMutation,
  } = useMutation({
    mutationFn: resetPasswordApi,
  })

  const {
    mutateAsync: googleLoginMutateAsync,
    isPending: isGoogleLoginPending,
    error: googleLoginError,
    reset: resetGoogleLoginMutation,
  } = useMutation({
    mutationFn: googleLoginApi,
  })

  const refreshAccount = useCallback(async (): Promise<AuthUser | null> => {
    if (!readTokenFromStorage()) return null
    const nextUser = await getAccount()
    setUser(nextUser)
    writeUserToStorage(nextUser)
    return nextUser
  }, [])

  const syncUserVerified = useCallback((isVerified: boolean) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, is_verified: isVerified }
      writeUserToStorage(next)
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true

    async function hydrateAccount() {
      if (!readTokenFromStorage()) {
        if (alive) setAuthInitializing(false)
        return
      }

      try {
        const account = await getAccount()
        if (!alive) return
        setUser(account)
        writeUserToStorage(account)
      } catch {
        if (!alive) return
        setUser(null)
        clearUserStorage()
        clearTokenStorage()
      } finally {
        if (alive) setAuthInitializing(false)
      }
    }

    void hydrateAccount()

    return () => {
      alive = false
    }
  }, [])

  const signIn = useCallback(
    async ({ email, password, remember }: SignInPayload): Promise<AuthUser> => {
      const {
        user: nextUser,
        token,
        refreshToken,
      } = await loginMutateAsync({
        email,
        password,
        role: DEFAULT_ROLE,
      })

      const persist = remember !== false
      if (token) writeTokenToStorage(token, persist)
      if (refreshToken) writeRefreshTokenToStorage(refreshToken, persist)

      let accountUser = nextUser
      if (token) {
        try {
          accountUser = await getAccount()
        } catch {
          accountUser = nextUser
        }
      }

      setUser(accountUser)
      writeUserToStorage(accountUser, persist)
      toastSuccess('Signed in successfully')
      return accountUser
    },
    [loginMutateAsync],
  )

  const signUp = useCallback(
    async (payload: SignUpPayload): Promise<SignUpResult> => {
      return registerMutateAsync({ ...payload, role: DEFAULT_ROLE })
    },
    [registerMutateAsync],
  )

  const verifyOtp = useCallback(
    async (payload: VerifyOtpPayload): Promise<void> => {
      await verifyOtpMutateAsync(payload)
    },
    [verifyOtpMutateAsync],
  )

  const forgotPassword = useCallback(
    async (payload: ForgotPasswordPayload): Promise<void> => {
      await forgotPasswordMutateAsync(payload)
    },
    [forgotPasswordMutateAsync],
  )

  const resetPassword = useCallback(
    async (payload: ResetPasswordPayload): Promise<void> => {
      await resetPasswordMutateAsync(payload)
    },
    [resetPasswordMutateAsync],
  )

  const signInWithGoogle = useCallback(
    async (token: string): Promise<AuthUser> => {
      const {
        user: nextUser,
        token: authToken,
        refreshToken,
      } = await googleLoginMutateAsync({
        token,
        role: DEFAULT_ROLE,
      })

      if (authToken) writeTokenToStorage(authToken)
      if (refreshToken) writeRefreshTokenToStorage(refreshToken)

      let accountUser = nextUser
      if (authToken) {
        try {
          accountUser = await getAccount()
        } catch {
          accountUser = nextUser
        }
      }

      setUser(accountUser)
      writeUserToStorage(accountUser)
      toastSuccess('Signed in successfully')
      return accountUser
    },
    [googleLoginMutateAsync],
  )

  const signOut = useCallback(() => {
    setUser(null)
    clearUserStorage()
    clearTokenStorage()
    toastSuccess('Logged out successfully')
  }, [])

  const resetAuthError = useCallback(() => {
    resetLoginMutation()
    resetRegisterMutation()
    resetVerifyOtpMutation()
    resetForgotPasswordMutation()
    resetPasswordMutation()
    resetGoogleLoginMutation()
  }, [
    resetLoginMutation,
    resetRegisterMutation,
    resetVerifyOtpMutation,
    resetForgotPasswordMutation,
    resetPasswordMutation,
    resetGoogleLoginMutation,
  ])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signUp,
      verifyOtp,
      forgotPassword,
      resetPassword,
      signInWithGoogle,
      refreshAccount,
      syncUserVerified,
      signOut,
      authLoading:
        isLoginPending ||
        isRegisterPending ||
        isVerifyOtpPending ||
        isForgotPasswordPending ||
        isResetPasswordPending ||
        isGoogleLoginPending,
      authInitializing,
      authError: (loginError ||
        registerError ||
        verifyOtpError ||
        forgotPasswordError ||
        resetPasswordError ||
        googleLoginError) as Error | null,
      resetAuthError,
    }),
    [
      user,
      signIn,
      signUp,
      verifyOtp,
      forgotPassword,
      resetPassword,
      signInWithGoogle,
      refreshAccount,
      syncUserVerified,
      signOut,
      isLoginPending,
      isRegisterPending,
      isVerifyOtpPending,
      isForgotPasswordPending,
      isResetPasswordPending,
      isGoogleLoginPending,
      authInitializing,
      loginError,
      registerError,
      verifyOtpError,
      forgotPasswordError,
      resetPasswordError,
      googleLoginError,
      resetAuthError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
