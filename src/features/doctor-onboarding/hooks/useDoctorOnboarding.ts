import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  getDoctorProfile,
  getDoctorVerificationStatus,
  saveDoctorProfile,
  uploadDoctorDocument,
} from '../api/doctorOnboardingApi'
import type { OnboardingStep } from '../constants'
import { profileExists } from '../lib/profileMappers'
import type { DoctorDocumentType, DoctorProfilePayload } from '../types'
import { isDoctorOnboardingComplete } from '../utils/access'

export const DOCTOR_PROFILE_QUERY_KEY = ['doctor-profile'] as const
export const DOCTOR_VERIFICATION_QUERY_KEY = ['doctor-verification-status'] as const

function resolveInitialStep(
  profileCompleted: boolean,
  documentsUploaded: number,
  hasLicenseDocument: boolean,
  isFullyVerified: boolean,
): OnboardingStep {
  if (isFullyVerified) return 'review'
  if (!profileCompleted) return 'profile'
  if (documentsUploaded === 0 || !hasLicenseDocument) return 'documents'
  return 'review'
}

export function useDoctorOnboarding() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, refreshAccount, syncUserVerified, signOut } = useAuth()
  const [activeStep, setActiveStep] = useState<OnboardingStep>('profile')
  const hasInitializedStep = useRef(false)
  const redirectHandledRef = useRef(false)

  const statusQuery = useQuery({
    queryKey: DOCTOR_VERIFICATION_QUERY_KEY,
    queryFn: getDoctorVerificationStatus,
    refetchInterval: (query) =>
      query.state.data?.verification_status === 'pending' ? 30_000 : false,
    retry: 1,
  })

  const profileQuery = useQuery({
    queryKey: DOCTOR_PROFILE_QUERY_KEY,
    queryFn: getDoctorProfile,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) return false
      return failureCount < 1
    },
    staleTime: 60_000,
  })

  const savedProfile = profileQuery.data ?? null
  const status = statusQuery.data?.verification_status ?? 'none'
  const profileCompleted = Boolean(statusQuery.data?.profile_completed)
  const documentsUploaded = statusQuery.data?.documents_uploaded ?? 0
  const documents = statusQuery.data?.documents ?? []
  const isFullyVerified = isDoctorOnboardingComplete(status, profileCompleted)
  const hasExistingProfile =
    profileCompleted || profileExists(savedProfile)

  const uploadedDocTypes = useMemo(
    () => new Set(documents.map((doc) => doc.doc_type)),
    [documents],
  )

  const hasLicenseDocument = uploadedDocTypes.has('license')

  const invalidateOnboardingQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DOCTOR_VERIFICATION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DOCTOR_PROFILE_QUERY_KEY }),
    ])
  }, [queryClient])

  useEffect(() => {
    if (!statusQuery.isSuccess || hasInitializedStep.current) return
    hasInitializedStep.current = true
    setActiveStep(
      resolveInitialStep(
        profileCompleted,
        documentsUploaded,
        hasLicenseDocument,
        isFullyVerified,
      ),
    )
  }, [
    statusQuery.isSuccess,
    profileCompleted,
    documentsUploaded,
    hasLicenseDocument,
    isFullyVerified,
  ])

  useEffect(() => {
    if (!statusQuery.isSuccess || !isFullyVerified) return
    if (redirectHandledRef.current) return
    redirectHandledRef.current = true

    syncUserVerified(true)
    navigate('/dashboard', { replace: true })

    void refreshAccount()
  }, [
    isFullyVerified,
    navigate,
    refreshAccount,
    statusQuery.isSuccess,
    syncUserVerified,
  ])

  const saveProfileMutation = useMutation({
    mutationFn: (payload: DoctorProfilePayload) =>
      saveDoctorProfile(payload, hasExistingProfile),
    onSuccess: async (profile) => {
      queryClient.setQueryData(DOCTOR_PROFILE_QUERY_KEY, profile)
      await invalidateOnboardingQueries()
      setActiveStep('documents')
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: uploadDoctorDocument,
    onSuccess: async () => {
      await invalidateOnboardingQueries()
    },
  })

  const goToStep = useCallback((step: OnboardingStep) => {
    setActiveStep(step)
  }, [])

  const canOpenDocuments = profileCompleted
  const canOpenReview =
    profileCompleted && documentsUploaded > 0 && hasLicenseDocument

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
        await uploadDocumentMutation.mutateAsync(item)
      }
    },
    [uploadDocumentMutation],
  )

  const isBootstrapping =
    statusQuery.isLoading ||
    (profileQuery.isLoading && !profileQuery.data && !profileQuery.isError)

  return {
    user,
    signOut,
    activeStep,
    goToStep,
    status,
    profileCompleted,
    isFullyVerified,
    documentsUploaded,
    documents,
    uploadedDocTypes,
    hasLicenseDocument,
    canOpenDocuments,
    canOpenReview,
    isBootstrapping,
    savedProfile,
    profileQuery,
    statusQuery,
    saveProfileMutation,
    uploadDocumentMutation,
    uploadDocumentsBatch,
  }
}
