import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { SignInPage } from '../../pages/auth/sign-in/SignInPage'
import { SignUpPage } from '../../pages/auth/sign-up/SignUpPage'
import { ForgotPasswordPage } from '../../pages/auth/forgot-password/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/auth/reset-password/ResetPasswordPage'
import { VerifyOtpPage } from '../../pages/auth/verify-otp/VerifyOtpPage'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { DashboardLayout } from '../../pages/dashboard/layout/DashboardLayout'
import { DashboardHomePage } from '../../pages/dashboard/routes/DashboardHomePage'
import { ComingSoonPage } from '../../pages/dashboard/routes/ComingSoonPage'

function IndexRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/dashboard' : '/sign-in'} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHomePage />} />
          <Route path="calendar" element={<ComingSoonPage title="Calendar" />} />
          <Route
            path="patient-records"
            element={<ComingSoonPage title="Patient Records" />}
          />
          <Route
            path="availability"
            element={<ComingSoonPage title="My Availability" />}
          />
          <Route path="profile" element={<ComingSoonPage title="Profile" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
