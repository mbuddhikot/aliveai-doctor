import type { PrescriptionCreateRequest } from '../types'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Client-side checks before POST /v1/doctor/prescriptions.
 * Catches missing/wrong fields early so we do not rely on opaque 422s.
 */
export function validatePrescriptionCreateRequest(
  payload: PrescriptionCreateRequest,
): void {
  const problems: string[] = []

  if (!payload.patient_user_id?.trim()) {
    problems.push('patient_user_id is required')
  } else if (!UUID_RE.test(payload.patient_user_id.trim())) {
    problems.push('patient_user_id must be a valid user id (UUID)')
  }

  if (!Array.isArray(payload.medications) || payload.medications.length === 0) {
    problems.push('at least one medication is required')
  } else {
    payload.medications.forEach((med, index) => {
      if (!med.name?.trim()) {
        problems.push(`medications[${index}].name is required`)
      }
    })
  }

  if (problems.length > 0) {
    throw new Error(
      `Cannot create prescription: ${problems.join('; ')}. ` +
        'If patient_user_id is missing, the appointment must include the patient id from the API.',
    )
  }
}
