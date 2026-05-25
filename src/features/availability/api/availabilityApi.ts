import { DEFAULT_PROFILE_TIMEZONE } from '../../doctor-onboarding/constants'
import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type {
  AvailabilitySlot,
  DayAvailability,
  DoctorAvailability,
  DoctorAvailabilityResponse,
  DoctorAvailabilitySetRequest,
  WeekdayId,
} from '../types'

export const DOCTOR_AVAILABILITY_QUERY_KEY = 'doctor-availability'

const LOCAL_STORAGE_KEY = 'aliveai.doctorAvailability'
const SET_AVAILABILITY_ENDPOINT = '/v1/doctor/availability'

const WEEKDAYS: Array<{ id: WeekdayId; label: string }> = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

const ID_TO_WEEKDAY: Record<WeekdayId, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

function createSlot(
  start: string,
  end: string,
  modes: AvailabilitySlot['modes'] = ['video'],
): AvailabilitySlot {
  return {
    id: crypto.randomUUID(),
    start,
    end,
    modes,
  }
}

export function createDefaultAvailability(
  doctorTimezone?: string,
): DoctorAvailability {
  return {
    timezone: doctorTimezone?.trim() || DEFAULT_PROFILE_TIMEZONE,
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

function normalizeTime(value: string): string {
  return value.slice(0, 5)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseApiResponse(payload: unknown): DoctorAvailabilityResponse {
  const root = isRecord(payload)
    ? isRecord(payload.data)
      ? payload.data
      : payload
    : {}

  const slots = Array.isArray(root.slots)
    ? root.slots.filter(isRecord).map((slot) => ({
        weekday: Number(slot.weekday),
        start_time: normalizeTime(String(slot.start_time || '09:00')),
        end_time: normalizeTime(String(slot.end_time || '17:00')),
        is_available: slot.is_available !== false,
      }))
    : []

  return {
    doctor_id: String(root.doctor_id || ''),
    slots,
  }
}

export function availabilityToApiRequest(
  availability: DoctorAvailability,
): DoctorAvailabilitySetRequest {
  const slots: DoctorAvailabilitySetRequest['slots'] = []

  availability.weekly.forEach((day) => {
    if (!day.enabled || day.slots.length === 0) return

    const weekday = ID_TO_WEEKDAY[day.id]
    day.slots.forEach((slot) => {
      slots.push({
        weekday,
        start_time: normalizeTime(slot.start),
        end_time: normalizeTime(slot.end),
        is_available: true,
      })
    })
  })

  return { slots }
}

export function availabilityFromApiResponse(
  response: DoctorAvailabilityResponse,
  base?: DoctorAvailability,
): DoctorAvailability {
  const fallback = base ?? createDefaultAvailability()
  const byWeekday = new Map<number, AvailabilitySlot[]>()

  response.slots.forEach((slot) => {
    if (!slot.is_available) return
    const list = byWeekday.get(slot.weekday) ?? []
    list.push({
      id: crypto.randomUUID(),
      start: normalizeTime(slot.start_time),
      end: normalizeTime(slot.end_time),
      modes: ['video'],
    })
    byWeekday.set(slot.weekday, list)
  })

  return {
    ...fallback,
    weekly: fallback.weekly.map((day) => {
      const weekday = ID_TO_WEEKDAY[day.id]
      const daySlots = byWeekday.get(weekday) ?? []
      return {
        ...day,
        enabled: daySlots.length > 0,
        slots: daySlots,
      }
    }),
    updatedAt: new Date().toISOString(),
  }
}

export function readAvailabilityDraft(): DoctorAvailability | null {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as DoctorAvailability
    if (!Array.isArray(parsed.weekly)) return null
    return parsed
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

export async function getDoctorAvailability(
  doctorId: string,
  profileTimezone?: string,
): Promise<DoctorAvailability> {
  try {
    const { data } = await apiClient.get<unknown>(
      `/v1/doctors/${doctorId}/availability`,
    )
    const response = parseApiResponse(data)
    const availability = availabilityFromApiResponse(
      response,
      createDefaultAvailability(profileTimezone),
    )
    const withProfileTimezone: DoctorAvailability = {
      ...availability,
      timezone:
        profileTimezone?.trim() ||
        availability.timezone ||
        DEFAULT_PROFILE_TIMEZONE,
    }
    writeAvailabilityDraft(withProfileTimezone)
    return withProfileTimezone
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load availability from the API'),
      { cause: err },
    )
  }
}

export async function saveDoctorAvailability(
  doctorId: string,
  availability: DoctorAvailability,
): Promise<DoctorAvailability> {
  const body = availabilityToApiRequest(availability)

  if (body.slots.length === 0) {
    throw new Error('Add at least one available slot before saving.')
  }

  try {
    const { data } = await apiClient.post<unknown>(
      SET_AVAILABILITY_ENDPOINT,
      body,
      { params: { doctor_id: doctorId } },
    )
    const response = parseApiResponse(data)
    const saved = availabilityFromApiResponse(response, availability)
    const withProfileTimezone: DoctorAvailability = {
      ...saved,
      timezone: availability.timezone,
    }
    writeAvailabilityDraft(withProfileTimezone)
    return withProfileTimezone
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to save availability'),
      { cause: err },
    )
  }
}
