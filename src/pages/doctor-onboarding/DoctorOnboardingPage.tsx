import clsx from 'clsx'
import logoImg from '../../assets/logo.png'
import { OnboardingStepper } from '../../features/doctor-onboarding/components/OnboardingStepper'
import { ProfileStepForm } from '../../features/doctor-onboarding/components/ProfileStepForm'
import { DocumentsStep } from '../../features/doctor-onboarding/components/DocumentsStep'
import { ReviewStep } from '../../features/doctor-onboarding/components/ReviewStep'
import { STATUS_META } from '../../features/doctor-onboarding/constants'
import { useDoctorOnboarding } from '../../features/doctor-onboarding/hooks/useDoctorOnboarding'
import { extractApiErrorMessage } from '../../lib/apiClient'

export function DoctorOnboardingPage() {
  const {
    user,
    signOut,
    activeStep,
    goToStep,
    status,
    profileCompleted,
    isFullyVerified,
    documentsUploaded,
    documents,
    canOpenDocuments,
    canOpenReview,
    hasLicenseDocument,
    isBootstrapping,
    savedProfile,
    profileQuery,
    statusQuery,
    saveProfileMutation,
    uploadDocumentMutation,
    uploadDocumentsBatch,
  } = useDoctorOnboarding()

  const statusMeta = STATUS_META[status]

  if (isFullyVerified && statusQuery.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7fc] text-sm font-medium text-[#64748b]">
        Your profile is verified. Opening dashboard…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7fc]">
      <header className="border-b border-[#e6e8ee] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <img
            src={logoImg}
            alt="AliveAI Doctor"
            className="h-12 w-auto object-contain"
          />
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'hidden rounded-full px-3 py-1 text-xs font-bold sm:inline',
                statusMeta.tone,
              )}
            >
              {statusMeta.label}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-[10px] border border-[#e6e8ee] px-4 py-2 text-sm font-semibold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a37ff]">
            Doctor onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.5px] text-black sm:text-4xl">
            {user?.first_name?.trim() || user?.name?.trim()
              ? `Welcome, ${user.first_name?.trim() || user.name?.trim()}`
              : 'Complete your profile'}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#878787]">
            Finish these steps to access your dashboard. Unverified accounts stay on
            this page until an admin approves your credentials.
          </p>
        </div>

        <OnboardingStepper
          activeStep={activeStep}
          profileDone={profileCompleted}
          documentsDone={hasLicenseDocument}
          onStepClick={goToStep}
          canOpenDocuments={canOpenDocuments}
          canOpenReview={canOpenReview}
        />

        <section className="mt-6 rounded-[16px] border border-[#e6e8ee] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
          {isBootstrapping ? (
            <div className="py-16 text-center text-sm font-medium text-[#64748b]">
              Loading your profile and verification status…
            </div>
          ) : statusQuery.isError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600">
                {extractApiErrorMessage(
                  statusQuery.error,
                  'Unable to load verification status',
                )}
              </p>
              <button
                type="button"
                onClick={() => void statusQuery.refetch()}
                className="mt-4 text-sm font-bold text-[#8a37ff] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {activeStep === 'profile' && (
                <ProfileStepForm
                  user={user}
                  savedProfile={savedProfile}
                  profileLoading={profileQuery.isLoading}
                  profileCompleted={profileCompleted}
                  isSaving={saveProfileMutation.isPending}
                  saveError={saveProfileMutation.error}
                  onSubmit={(payload) => saveProfileMutation.mutate(payload)}
                />
              )}

              {activeStep === 'documents' && (
                <DocumentsStep
                  documents={documents}
                  isUploading={uploadDocumentMutation.isPending}
                  uploadError={uploadDocumentMutation.error}
                  onUploadBatch={uploadDocumentsBatch}
                  onContinue={() => goToStep('review')}
                />
              )}

              {activeStep === 'review' && (
                <ReviewStep
                  status={status}
                  profileCompleted={profileCompleted}
                  documentsUploaded={documentsUploaded}
                  rejectionReason={statusQuery.data?.rejection_reason}
                  isRefreshing={statusQuery.isFetching}
                  statusError={statusQuery.error}
                  onRefresh={() => void statusQuery.refetch()}
                  onEditProfile={() => goToStep('profile')}
                  onEditDocuments={() => goToStep('documents')}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
