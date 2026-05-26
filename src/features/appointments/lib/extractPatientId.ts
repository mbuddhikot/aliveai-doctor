type RawRecord = Record<string, unknown>

const PATIENT_ID_KEYS = [
  'patient_id',
  'patient_user_id',
  'patientId',
  'patientUserId',
  'booked_by_user_id',
  'booker_user_id',
  'booked_for_user_id',
] as const

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function extractPatientId(
  item: unknown,
  doctorId?: string | null,
): string | undefined {
  if (!isRecord(item)) return undefined

  for (const key of PATIENT_ID_KEYS) {
    const id = str(item[key])
    if (id && isUuidLike(id)) return id
  }

  const doctorIdNorm = doctorId?.trim()
  const rootUserId = str(item.user_id) || str(item.userId)
  if (rootUserId && rootUserId !== doctorIdNorm && isUuidLike(rootUserId)) {
    return rootUserId
  }

  const patient = isRecord(item.patient) ? item.patient : null
  const user = isRecord(item.user)
    ? item.user
    : isRecord(item.booked_by)
      ? item.booked_by
      : null
  const booker = isRecord(item.booker) ? item.booker : null
  const bookedBy = isRecord(item.booked_by) ? item.booked_by : null

  for (const nested of [patient, user, booker, bookedBy]) {
    if (!nested) continue
    for (const key of PATIENT_ID_KEYS) {
      const id = str(nested[key])
      if (id && isUuidLike(id)) return id
    }
    const nestedId = str(nested.id) || str(nested.user_id)
    if (
      nestedId &&
      nestedId !== doctorIdNorm &&
      isUuidLike(nestedId)
    ) {
      return nestedId
    }
  }

  for (const value of Object.values(item)) {
    if (!isRecord(value)) continue
    if (value === patient || value === user || value === booker || value === bookedBy) {
      continue
    }
    const found = extractPatientId(value, doctorId)
    if (found) return found
  }

  return undefined
}
