import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { FiRefreshCw } from 'react-icons/fi'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import {
  getDoctorProfile,
  getDoctorVerificationStatus,
  saveDoctorProfile,
  updateDoctorDocument,
  uploadDoctorDocument,
} from '../../../features/doctor-onboarding/api/doctorOnboardingApi'
import { DocumentsStep } from '../../../features/doctor-onboarding/components/DocumentsStep'
import { ProfileStepForm } from '../../../features/doctor-onboarding/components/ProfileStepForm'
import { STATUS_META } from '../../../features/doctor-onboarding/constants'
import {
  DOCTOR_PROFILE_QUERY_KEY,
  DOCTOR_VERIFICATION_QUERY_KEY,
} from '../../../features/doctor-onboarding/hooks/useDoctorOnboarding'
import { profileExists } from '../../../features/doctor-onboarding/lib/profileMappers'
import type { profileFormToPayload } from '../../../features/doctor-onboarding/lib/profileSchema'
import type { DoctorDocumentType } from '../../../features/doctor-onboarding/types'
import { extractApiErrorMessage } from '../../../lib/apiClient'

export function DoctorProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [saveSuccess, setSaveSuccess] = useState(false)

  const statusQuery = useQuery({
    queryKey: DOCTOR_VERIFICATION_QUERY_KEY,
    queryFn: getDoctorVerificationStatus,
    staleTime: 30_000,
  })

  const profileQuery = useQuery({
    queryKey: DOCTOR_PROFILE_QUERY_KEY,
    queryFn: getDoctorProfile,
    staleTime: 60_000,
  })

  const status = statusQuery.data?.verification_status ?? 'none'
  const statusMeta = STATUS_META[status]
  const profileCompleted = Boolean(statusQuery.data?.profile_completed)
  const savedProfile = profileQuery.data ?? null
  const documents =
    statusQuery.data?.documents ?? savedProfile?.documents ?? []
  const hasExistingProfile =
    profileCompleted || profileExists(savedProfile)

  const invalidateProfileData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DOCTOR_VERIFICATION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DOCTOR_PROFILE_QUERY_KEY }),
    ])
  }, [queryClient])

  const saveProfileMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof profileFormToPayload>) =>
      saveDoctorProfile(payload, hasExistingProfile),
    onSuccess: async (profile) => {
      queryClient.setQueryData(DOCTOR_PROFILE_QUERY_KEY, profile)
      await invalidateProfileData()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: uploadDoctorDocument,
    onSuccess: async () => {
      await invalidateProfileData()
    },
  })

  const updateDocumentMutation = useMutation({
    mutationFn: updateDoctorDocument,
    onSuccess: async () => {
      await invalidateProfileData()
    },
  })

  const uploadDocumentsBatch = useCallback(
    async (
      items: { file: File; doc_type: DoctorDocumentType }[],
      onProgress?: (
        current: number,
        total: number,
        docType: DoctorDocumentType,
      ) => void,
    ) => {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]
        onProgress?.(index + 1, items.length, item.doc_type)
        const existing = [...documents]
          .filter((doc) => doc.doc_type === item.doc_type)
          .sort(
            (a, b) =>
              new Date(b.uploaded_at).getTime() -
              new Date(a.uploaded_at).getTime(),
          )[0]

        if (existing) {
          await updateDocumentMutation.mutateAsync({
            documentId: existing.id,
            file: item.file,
            doc_type: item.doc_type,
          })
        } else {
          await uploadDocumentMutation.mutateAsync(item)
        }
      }
    },
    [documents, updateDocumentMutation, uploadDocumentMutation],
  )

  const isLoading =
    statusQuery.isLoading ||
    (profileQuery.isLoading && !profileQuery.data && !profileQuery.isError)

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-[0_18px_32px_rgba(31,41,55,0.08)]">
        <p className="text-sm font-medium text-[#64748b]">Loading your profile…</p>
      </section>
    )
  }

  if (statusQuery.isError) {
    return (
      <section className="rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-[0_18px_32px_rgba(31,41,55,0.08)]">
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
      </section>
    )
  }

  if (!profileCompleted && !savedProfile) {
    return (
      <section className="rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-[0_18px_32px_rgba(31,41,55,0.08)]">
        <h2 className="text-2xl font-bold text-black">Profile</h2>
        <p className="mt-2 text-base text-[#64748b]">
          You have not completed doctor onboarding yet. Finish your professional
          profile and upload credentials to use the dashboard.
        </p>
        <Link
          to="/doctor-onboarding"
          className="mt-6 inline-flex h-12 items-center rounded-[10px] bg-[#8a37ff] px-6 text-sm font-bold text-white transition hover:bg-[#772cf0]"
        >
          Continue onboarding
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#dfe3ea] bg-white p-6 shadow-[0_18px_32px_rgba(31,41,55,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">Profile</h2>
            <p className="mt-1 text-sm text-[#64748b]">{statusMeta.message}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-bold',
                statusMeta.tone,
              )}
            >
              {statusMeta.label}
            </span>
            <button
              type="button"
              disabled={statusQuery.isFetching}
              onClick={() => void statusQuery.refetch()}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#dfe3ea] bg-white px-4 text-sm font-semibold text-[#64748b] transition hover:border-[#8a37ff] hover:text-[#8a37ff] disabled:opacity-60"
            >
              <FiRefreshCw
                className={clsx('h-4 w-4', statusQuery.isFetching && 'animate-spin')}
              />
              Refresh
            </button>
          </div>
        </div>

        {statusQuery.data?.rejection_reason && (
          <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span className="font-bold">Rejection reason: </span>
            {statusQuery.data.rejection_reason}
          </p>
        )}

        {status === 'pending' && (
          <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Your profile is under review. You can still update details below; changes
            may be reviewed before approval.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#dfe3ea] bg-white p-6 shadow-[0_18px_32px_rgba(31,41,55,0.08)] sm:p-8">
        {saveSuccess && (
          <p className="mb-6 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Profile saved successfully.
          </p>
        )}
        <ProfileStepForm
          variant="dashboard"
          user={user}
          savedProfile={savedProfile}
          profileLoading={profileQuery.isLoading}
          profileCompleted={profileCompleted}
          isSaving={saveProfileMutation.isPending}
          saveError={saveProfileMutation.error}
          onSubmit={(payload) => saveProfileMutation.mutate(payload)}
        />
      </section>

      <section className="rounded-2xl border border-[#dfe3ea] bg-white p-6 shadow-[0_18px_32px_rgba(31,41,55,0.08)] sm:p-8">
        <DocumentsStep
          variant="dashboard"
          documents={documents}
          isUploading={uploadDocumentMutation.isPending}
          isUpdating={updateDocumentMutation.isPending}
          uploadError={
            uploadDocumentMutation.error ??
            updateDocumentMutation.error
          }
          onUploadBatch={uploadDocumentsBatch}
          onUpdateDocument={(params) => updateDocumentMutation.mutateAsync(params)}
        />
      </section>
    </div>
  )
}
