import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { SignInPage } from '../../pages/auth/sign-in/SignInPage'
import { SignUpPage } from '../../pages/auth/sign-up/SignUpPage'
import { ForgotPasswordPage } from '../../pages/auth/forgot-password/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/auth/reset-password/ResetPasswordPage'
import { VerifyOtpPage } from '../../pages/auth/verify-otp/VerifyOtpPage'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { resolvePostAuthPath } from '../../features/auth/utils/postAuthPath'
import { DashboardLayout } from '../../pages/dashboard/layout/DashboardLayout'
import { DashboardHomePage } from '../../pages/dashboard/routes/DashboardHomePage'
import { CalendarPage } from '../../pages/dashboard/routes/CalendarPage'
import { MyAppointmentsPage } from '../../pages/dashboard/routes/MyAppointmentsPage'
import { AvailabilityPage } from '../../pages/dashboard/routes/AvailabilityPage'
import { ComingSoonPage } from '../../pages/dashboard/routes/ComingSoonPage'
import { DoctorOnboardingPage } from '../../pages/doctor-onboarding/DoctorOnboardingPage'

function IndexRedirect() {
  const { isAuthenticated, user } = useAuth()
  return (
    <Navigate
      to={isAuthenticated ? resolvePostAuthPath(user) : '/sign-in'}
      replace
    />
  )
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
        <Route path="/doctor-onboarding" element={<DoctorOnboardingPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHomePage />} />
          <Route path="appointments" element={<MyAppointmentsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route
            path="patient-records"
            element={<ComingSoonPage title="Patient Records" />}
          />
          <Route
            path="availability"
            element={<AvailabilityPage />}
          />
          <Route path="profile" element={<ComingSoonPage title="Profile" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
