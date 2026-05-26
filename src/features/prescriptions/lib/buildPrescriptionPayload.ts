import type { MedicationItem, PrescriptionCreateRequest, UpdatePrescriptionPayload } from '../types'

export function buildPrescriptionPayload(input: {
  diagnosis: string
  notes: string
}): Pick<PrescriptionCreateRequest, 'diagnosis' | 'notes' | 'medications'> {
  const notes = input.notes.trim()
  const diagnosis = input.diagnosis.trim() || null

  const medications: MedicationItem[] = [
    {
      name: diagnosis || 'Prescription',
      instructions: notes.slice(0, 500) || null,
    },
  ]

  return {
    diagnosis,
    notes,
    medications,
  }
}

export function buildUpdatePrescriptionPayload(input: {
  diagnosis: string
  notes: string
}): UpdatePrescriptionPayload {
  return buildPrescriptionPayload(input)
}
