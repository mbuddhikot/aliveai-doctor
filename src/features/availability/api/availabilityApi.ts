import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type {
  AvailabilityException,
  AvailabilitySlot,
  ConsultationMode,
  DayAvailability,
  DoctorAvailability,
  WeekdayId,
} from '../types'

const LOCAL_STORAGE_KEY = 'aliveai.doctorAvailability'
const DOCTOR_AVAILABILITY_ENDPOINT = '/v1/doctor/availability'

const WEEKDAYS: Array<{ id: WeekdayId; label: string }> = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

function createSlot(
  start: string,
  end: string,
  modes: ConsultationMode[] = ['video'],
): AvailabilitySlot {
  return {
    id: crypto.randomUUID(),
    start,
    end,
    modes,
  }
}

export function createDefaultAvailability(): DoctorAvailability {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    slotDurationMinutes: 30,
    bufferMinutes: 10,
    bookingWindowDays: 30,
    weekly: WEEKDAYS.map((day, index) => ({
      ...day,
      enabled: index < 5,
      slots:
        index < 5
          ? [
              createSlot('09:00', '12:00', ['video', 'clinic']),
              createSlot('14:00', '17:00', ['video']),
            ]
          : [],
    })),
    exceptions: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeModes(value: unknown): ConsultationMode[] {
  if (!Array.isArray(value)) return ['video']
  const modes = value.filter((mode): mode is ConsultationMode =>
    ['video', 'clinic', 'home'].includes(String(mode)),
  )
  return modes.length > 0 ? modes : ['video']
}

function normalizeSlots(value: unknown): AvailabilitySlot[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .map((slot) => ({
      id: String(slot.id || crypto.randomUUID()),
      start: String(slot.start || slot.start_time || '09:00').slice(0, 5),
      end: String(slot.end || slot.end_time || '17:00').slice(0, 5),
      modes: normalizeModes(slot.modes || slot.consultation_modes),
    }))
}

function normalizeDay(value: unknown, fallback: DayAvailability): DayAvailability {
  if (!isRecord(value)) return fallback

  return {
    id: fallback.id,
    label: String(value.label || fallback.label),
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : normalizeSlots(value.slots).length > 0,
    slots: normalizeSlots(value.slots),
  }
}

function normalizeExceptions(value: unknown): AvailabilityException[] {
  if (!Array.isArray(value)) return []

  return value.filter(isRecord).map((item) => ({
    id: String(item.id || crypto.randomUUID()),
    date: String(item.date || ''),
    reason: String(item.reason || ''),
    unavailable:
      typeof item.unavailable === 'boolean' ? item.unavailable : true,
  }))
}

export function normalizeAvailability(payload: unknown): DoctorAvailability {
  const fallback = createDefaultAvailability()
  const root = isRecord(payload)
    ? isRecord(payload.data)
      ? payload.data
      : payload
    : {}

  const rawWeekly = root.weekly || root.weekly_availability || root.availability
  const weeklyById = new Map<string, unknown>()

  if (Array.isArray(rawWeekly)) {
    rawWeekly.filter(isRecord).forEach((day) => {
      const id = String(day.id || day.day || day.weekday || '').toLowerCase()
      weeklyById.set(id, day)
    })
  }

  return {
    timezone: String(root.timezone || fallback.timezone),
    slotDurationMinutes: Number(
      root.slotDurationMinutes || root.slot_duration_minutes || 30,
    ),
    bufferMinutes: Number(root.bufferMinutes || root.buffer_minutes || 10),
    bookingWindowDays: Number(
      root.bookingWindowDays || root.booking_window_days || 30,
    ),
    weekly: fallback.weekly.map((day) =>
      normalizeDay(weeklyById.get(day.id), day),
    ),
    exceptions: normalizeExceptions(root.exceptions),
    updatedAt: typeof root.updatedAt === 'string' ? root.updatedAt : undefined,
  }
}

export function readAvailabilityDraft(): DoctorAvailability | null {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) return null

  try {
    return normalizeAvailability(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeAvailabilityDraft(availability: DoctorAvailability): void {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      ...availability,
      updatedAt: new Date().toISOString(),
    }),
  )
}

export async function getDoctorAvailability(): Promise<DoctorAvailability> {
  try {
    const { data } = await apiClient.get<unknown>(DOCTOR_AVAILABILITY_ENDPOINT)
    const availability = normalizeAvailability(data)
    writeAvailabilityDraft(availability)
    return availability
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load availability from the API'),
      { cause: err },
    )
  }
}

export async function saveDoctorAvailability(
  availability: DoctorAvailability,
): Promise<DoctorAvailability> {
  try {
    const { data } = await apiClient.put<unknown>(
      DOCTOR_AVAILABILITY_ENDPOINT,
      availability,
    )
    const saved = normalizeAvailability(data)
    writeAvailabilityDraft(saved)
    return saved
  } catch (err) {
    writeAvailabilityDraft(availability)
    throw new Error(
      extractApiErrorMessage(
        err,
        'Saved locally. The API did not accept availability yet.',
      ),
      { cause: err },
    )
  }
}
