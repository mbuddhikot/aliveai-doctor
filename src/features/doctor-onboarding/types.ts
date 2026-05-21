export type DoctorVerificationStatus = 'none' | 'pending' | 'verified' | 'rejected'

export type Specialization = {
  id: number
  name: string
  icon: string
}

export type SpecializationListResponse = {
  data: Specialization[]
  total: number
}

export type DoctorDocumentType =
  | 'degree'
  | 'experience_certificate'
  | 'id_proof'
  | 'license'
  | 'other'

export type DoctorProfilePayload = {
  full_name: string
  specialty: string
  qualifications: string[]
  registration_number: string
  phone: string
  years_experience: number
  bio?: string | null
  fee_amount?: number | null
  fee_currency?: string | null
  session_minutes?: number | null
}

export type DoctorProfile = Omit<DoctorProfilePayload, 'specialty'> & {
  specialty: string | null
  id: string
  user_id: string
  verification_status: DoctorVerificationStatus
  is_active: boolean
  profile_completed_at?: string | null
  verified_at?: string | null
  rejection_reason?: string | null
  created_at?: string
  updated_at?: string
}

export type DoctorDocument = {
  id: string
  doc_type: DoctorDocumentType
  file_name?: string | null
  content_type?: string | null
  gcs_url: string
  uploaded_at: string
}

export type DoctorDocumentUploadResponse = {
  id: string
  doc_type: DoctorDocumentType
  gcs_url: string
  uploaded_at: string
}

export type DoctorVerificationSummary = {
  verification_status: DoctorVerificationStatus
  profile_completed: boolean
  documents_uploaded: number
  documents: DoctorDocument[]
  doctor_id?: string | null
  rejection_reason?: string | null
  verified_at?: string | null
}
