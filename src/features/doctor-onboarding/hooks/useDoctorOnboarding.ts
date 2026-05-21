import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  getDoctorVerificationStatus,
  saveDoctorProfile,
  uploadDoctorDocument,
} from '../api/doctorOnboardingApi'
import type { OnboardingStep } from '../constants'
import type { DoctorDocumentType, DoctorProfilePayload } from '../types'
import { isDoctorOnboardingComplete } from '../utils/access'

function resolveInitialStep(
  profileCompleted: boolean,
  documentsUploaded: number,
  isFullyVerified: boolean,
): OnboardingStep {
  if (isFullyVerified) return 'review'
  if (!profileCompleted) return 'profile'
  if (documentsUploaded === 0) return 'documents'
  return 'review'
}

export function useDoctorOnboarding() {
  const navigate = useNavigate()
  const { user, refreshAccount, syncUserVerified, signOut } = useAuth()
  const [activeStep, setActiveStep] = useState<OnboardingStep>('profile')
  const hasInitializedStep = useRef(false)
  const redirectHandledRef = useRef(false)

  const statusQuery = useQuery({
    queryKey: ['doctor-verification-status'],
    queryFn: getDoctorVerificationStatus,
    refetchInterval: (query) =>
      query.state.data?.verification_status === 'pending' ? 30_000 : false,
    retry: 1,
  })

  const status = statusQuery.data?.verification_status ?? 'none'
  const profileCompleted = Boolean(statusQuery.data?.profile_completed)
  const documentsUploaded = statusQuery.data?.documents_uploaded ?? 0
  const documents = statusQuery.data?.documents ?? []
  const isFullyVerified = isDoctorOnboardingComplete(status, profileCompleted)

  useEffect(() => {
    if (!statusQuery.isSuccess || hasInitializedStep.current) return
    hasInitializedStep.current = true
    setActiveStep(
      resolveInitialStep(profileCompleted, documentsUploaded, isFullyVerified),
    )
  }, [
    statusQuery.isSuccess,
    profileCompleted,
    documentsUploaded,
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
      saveDoctorProfile(payload, profileCompleted),
    onSuccess: async () => {
      await statusQuery.refetch()
      setActiveStep('documents')
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: uploadDoctorDocument,
    onSuccess: async () => {
      await statusQuery.refetch()
    },
  })

  const goToStep = useCallback((step: OnboardingStep) => {
    setActiveStep(step)
  }, [])

  const uploadedDocTypes = useMemo(
    () => new Set(documents.map((doc) => doc.doc_type)),
    [documents],
  )

  const canOpenDocuments = profileCompleted
  const canOpenReview = profileCompleted && documentsUploaded > 0

  const uploadDocumentsBatch = useCallback(
    async (
      items: { file: File; doc_type: DoctorDocumentType }[],
      onProgress?: (current: number, total: number, docType: DoctorDocumentType) => void,
    ) => {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]
        onProgress?.(index + 1, items.length, item.doc_type)
        await uploadDocumentMutation.mutateAsync(item)
      }
    },
    [uploadDocumentMutation],
  )

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
    canOpenDocuments,
    canOpenReview,
    statusQuery,
    saveProfileMutation,
    uploadDocumentMutation,
    uploadDocumentsBatch,
  }
}
