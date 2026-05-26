export type MedicationItem = {
  name: string
  dose?: string | null
  frequency?: string | null
  duration_days?: number | null
  instructions?: string | null
}

export type PrescriptionStatus = 'active' | 'cancelled'

export type Prescription = {
  id: string
  doctor_id: string
  doctor_name?: string | null
  patient_id: string
  patient_name?: string | null
  appointment_id?: string | null
  diagnosis?: string | null
  notes?: string | null
  medications: MedicationItem[]
  status: PrescriptionStatus
  created_at: string
  updated_at: string
}

export type PrescriptionListResponse = {
  data: Prescription[]
  total: number
}

/**
 * Wire body for POST /v1/doctor/prescriptions.
 * Must match OpenAPI `PrescriptionCreateRequest` (required: patient_user_id, medications).
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/prescriptions/create_prescription_v1_doctor_prescriptions_post
 */
export type PrescriptionCreateRequest = {
  patient_user_id: string
  appointment_id?: string | null
  diagnosis?: string | null
  notes?: string | null
  medications: MedicationItem[]
}

/** @deprecated Use PrescriptionCreateRequest — kept for gradual migration */
export type CreatePrescriptionPayload = PrescriptionCreateRequest

export type UpdatePrescriptionPayload = {
  diagnosis?: string | null
  notes?: string | null
  medications?: MedicationItem[] | null
  status?: PrescriptionStatus | null
}
