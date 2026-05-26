import type { PrescriptionCreateRequest } from '../types'
import { buildPrescriptionPayload } from './buildPrescriptionPayload'
import { validatePrescriptionCreateRequest } from './validatePrescriptionCreateRequest'

/**
 * Builds the exact JSON body the backend expects (patient_user_id, not patient_id).
 */
export function buildCreatePrescriptionPayload(input: {
  appointmentId: string
  /** Patient's `users.id` — from appointment.patient_id / patient_user_id in API responses */
  patientUserId: string
  diagnosis: string
  notes: string
}): PrescriptionCreateRequest {
  const body = buildPrescriptionPayload({
    diagnosis: input.diagnosis,
    notes: input.notes,
  })

  const request: PrescriptionCreateRequest = {
    patient_user_id: input.patientUserId.trim(),
    appointment_id: input.appointmentId,
    ...body,
  }

  validatePrescriptionCreateRequest(request)
  return request
}
