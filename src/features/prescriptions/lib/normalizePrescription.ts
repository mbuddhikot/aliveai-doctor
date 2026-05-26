import type { Prescription } from '../types'

type RawPrescription = Record<string, unknown>

function isRecord(value: unknown): value is RawPrescription {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

export function normalizePrescription(item: RawPrescription): Prescription {
  const patientId =
    str(item.patient_id) ||
    str(item.patient_user_id) ||
    str(item.patientId) ||
    ''

  return {
    id: String(item.id || ''),
    doctor_id: String(item.doctor_id || ''),
    doctor_name: str(item.doctor_name) ?? null,
    patient_id: patientId,
    patient_name: str(item.patient_name) ?? null,
    appointment_id: str(item.appointment_id) ?? null,
    diagnosis: str(item.diagnosis) ?? null,
    notes: str(item.notes) ?? null,
    medications: Array.isArray(item.medications)
      ? (item.medications as Prescription['medications'])
      : [],
    status: (item.status === 'cancelled' ? 'cancelled' : 'active') as Prescription['status'],
    created_at: String(item.created_at || new Date().toISOString()),
    updated_at: String(item.updated_at || new Date().toISOString()),
  }
}

export function normalizePrescriptionList(payload: unknown): Prescription[] {
  const source = isRecord(payload)
    ? payload.data || payload.prescriptions || payload.results
    : payload

  if (!Array.isArray(source)) return []
  return source.filter(isRecord).map(normalizePrescription)
}
