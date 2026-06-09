import { DEFAULT_PROFILE_TIMEZONE } from '../../doctor-onboarding/constants'
import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import {
  defaultSelectedWeekStarts,
  sortWeekStarts,
} from '../lib/availabilityWeeks'
import type {
  AvailabilitySlot,
  DoctorAvailability,
  DoctorAvailabilityResponse,
  DoctorAvailabilitySetRequest,
  DoctorBookingRules,
  DoctorBookingRulesUpdateRequest,
  WeekdayId,
} from '../types'

export const DOCTOR_AVAILABILITY_QUERY_KEY = 'doctor-availability'

const LOCAL_STORAGE_KEY = 'aliveai.doctorAvailability'
/** @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/set_doctor_availability_v1_doctor_availability_post */
const SET_AVAILABILITY_ENDPOINT = '/v1/doctor/availability'
const GET_DOCTOR_AVAILABILITY_ENDPOINT = '/v1/doctors'
/** @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/update_doctor_booking_rules_v1_doctor_booking_rules_put */
const BOOKING_RULES_ENDPOINT = '/v1/doctor/booking-rules'

const ALLOWED_SLOT_DURATIONS = [15, 20, 30, 45, 60] as const
const ALLOWED_BUFFER_MINUTES = [0, 5, 10, 15, 20] as const

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

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isDateKey(value: string): boolean {
  return DATE_KEY_PATTERN.test(value)
}

function normalizeApiDateKey(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (isDateKey(raw)) return raw
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

function parseAvailableWeekStartsFromApi(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const weekStarts = value
    .filter(isRecord)
    .map((week) => normalizeApiDateKey(week.week_start))
    .filter(isDateKey)

  return sortWeekStarts(weekStarts)
}

/** Prefer API weeks when present; otherwise keep what the doctor already selected. */
function resolveSelectedWeekStartsAfterSave(
  response: DoctorAvailabilityResponse,
  savedAvailability: DoctorAvailability,
  submittedAvailability: DoctorAvailability,
): string[] {
  const fromResponse = parseAvailableWeekStartsFromApi(
    response.available_weeks,
  )
  if (fromResponse !== undefined && fromResponse.length > 0) {
    return fromResponse
  }

  const submitted = sortWeekStarts(submittedAvailability.selectedWeekStarts)
  if (submitted.length > 0) {
    return submitted
  }

  if (fromResponse !== undefined) {
    return fromResponse
  }

  return savedAvailability.selectedWeekStarts
}

function resolveSelectedWeekStarts(
  value: unknown,
  doctorTimezone: string,
  options?: { useDefaultWhenEmpty?: boolean },
): string[] {
  const parsed = parseAvailableWeekStartsFromApi(value)
  if (parsed !== undefined) {
    if (parsed.length > 0 || !options?.useDefaultWhenEmpty) {
      return parsed
    }
  }

  if (Array.isArray(value)) {
    const weekStarts = value.filter(
      (item): item is string => typeof item === 'string' && isDateKey(item),
    )
    if (weekStarts.length > 0) {
      return sortWeekStarts(weekStarts)
    }
    if (!options?.useDefaultWhenEmpty) {
      return []
    }
  }

  return defaultSelectedWeekStarts(doctorTimezone)
}

function selectedWeekStartsToApiRequest(
  selectedWeekStarts: string[],
): DoctorAvailabilitySetRequest['available_weeks'] {
  return sortWeekStarts(selectedWeekStarts).map((week_start) => ({
    week_start,
  }))
}

export function createDefaultAvailability(
  doctorTimezone?: string,
): DoctorAvailability {
  const timezone = doctorTimezone?.trim() || DEFAULT_PROFILE_TIMEZONE
  return {
    timezone,
    slotDurationMinutes: 30,
    bufferMinutes: 10,
    bookingWindowDays: 30,
    selectedWeekStarts: defaultSelectedWeekStarts(timezone),
    weekly: WEEKDAYS.map((day, index) => ({
      ...day,
      enabled: index < 5,
      slots:
        index < 5
          ? [
              createSlot('09:00', '12:00', ['video']),
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

function coerceSlotDurationMinutes(
  value: unknown,
  fallback: number,
): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (
    ALLOWED_SLOT_DURATIONS.includes(
      n as (typeof ALLOWED_SLOT_DURATIONS)[number],
    )
  ) {
    return n
  }
  return fallback
}

function coerceBufferMinutes(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (
    ALLOWED_BUFFER_MINUTES.includes(n as (typeof ALLOWED_BUFFER_MINUTES)[number])
  ) {
    return n
  }
  return fallback
}

function parseBookingRules(payload: unknown): DoctorBookingRules {
  const root = isRecord(payload)
    ? isRecord(payload.data)
      ? payload.data
      : payload
    : {}
  const fallback = createDefaultAvailability()

  return {
    slot_duration_minutes: coerceSlotDurationMinutes(
      root.slot_duration_minutes,
      fallback.slotDurationMinutes,
    ),
    buffer_between_visits_minutes: coerceBufferMinutes(
      root.buffer_between_visits_minutes,
      fallback.bufferMinutes,
    ),
  }
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

  const availableWeeks = Array.isArray(root.available_weeks)
    ? root.available_weeks.filter(isRecord).map((week) => ({
        week_start: String(week.week_start || '').trim(),
        week_end: String(week.week_end || '').trim(),
      }))
    : undefined

  return {
    doctor_id: String(root.doctor_id || ''),
    slot_duration_minutes:
      root.slot_duration_minutes !== undefined
        ? Number(root.slot_duration_minutes)
        : undefined,
    buffer_between_visits_minutes:
      root.buffer_between_visits_minutes !== undefined
        ? Number(root.buffer_between_visits_minutes)
        : undefined,
    slots,
    available_weeks: availableWeeks,
  }
}

export function availabilityToApiRequest(
  availability: DoctorAvailability,
): DoctorAvailabilitySetRequest {
  const slots: DoctorAvailabilitySetRequest['slots'] = []

  availability.weekly.forEach((day) => {
    const weekday = ID_TO_WEEKDAY[day.id]

    if (!day.enabled || day.slots.length === 0) {
      return
    }

    day.slots.forEach((slot) => {
      slots.push({
        weekday,
        start_time: normalizeTime(slot.start),
        end_time: normalizeTime(slot.end),
        is_available: true,
      })
    })
  })

  return {
    slot_duration_minutes: coerceSlotDurationMinutes(
      availability.slotDurationMinutes,
      30,
    ),
    buffer_between_visits_minutes: coerceBufferMinutes(
      availability.bufferMinutes,
      10,
    ),
    slots,
    available_weeks: selectedWeekStartsToApiRequest(
      availability.selectedWeekStarts,
    ),
  }
}

function availabilityRequestParams(
  doctorId?: string,
): { doctor_id: string } | undefined {
  const id = doctorId?.trim()
  return id ? { doctor_id: id } : undefined
}

/** GET /v1/doctors/{doctor_id}/availability */
export async function fetchDoctorAvailabilitySchedule(
  doctorId: string,
): Promise<DoctorAvailabilityResponse> {
  try {
    const { data } = await apiClient.get<unknown>(
      `${GET_DOCTOR_AVAILABILITY_ENDPOINT}/${encodeURIComponent(doctorId)}/availability`,
    )
    return parseApiResponse(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load availability schedule'),
      { cause: err },
    )
  }
}

/**
 * POST /v1/doctor/availability — replace weekly bookable windows.
 * `doctor_id` query is optional when authenticated as the doctor.
 */
export async function setDoctorAvailability(
  body: DoctorAvailabilitySetRequest,
  doctorId?: string,
): Promise<DoctorAvailabilityResponse> {
  if (body.slots.length === 0) {
    throw new Error('Add at least one available slot before saving.')
  }

  try {
    const params = availabilityRequestParams(doctorId)
    const { data } = await apiClient.post<unknown>(
      SET_AVAILABILITY_ENDPOINT,
      {
        slot_duration_minutes: body.slot_duration_minutes,
        buffer_between_visits_minutes: body.buffer_between_visits_minutes,
        slots: body.slots.map((slot) => ({
          weekday: slot.weekday,
          start_time: normalizeTime(slot.start_time),
          end_time: normalizeTime(slot.end_time),
          is_available: slot.is_available !== false,
        })),
        available_weeks: body.available_weeks ?? [],
      },
      params ? { params } : undefined,
    )
    return parseApiResponse(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to set availability'),
      { cause: err },
    )
  }
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

  const apiWeekStarts = parseAvailableWeekStartsFromApi(
    response.available_weeks,
  )

  return {
    ...fallback,
    slotDurationMinutes: coerceSlotDurationMinutes(
      response.slot_duration_minutes,
      fallback.slotDurationMinutes,
    ),
    bufferMinutes: coerceBufferMinutes(
      response.buffer_between_visits_minutes,
      fallback.bufferMinutes,
    ),
    selectedWeekStarts:
      apiWeekStarts !== undefined
        ? apiWeekStarts
        : fallback.selectedWeekStarts,
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
    const timezone = parsed.timezone?.trim() || DEFAULT_PROFILE_TIMEZONE
    return {
      ...parsed,
      selectedWeekStarts: resolveSelectedWeekStarts(
        parsed.selectedWeekStarts,
        timezone,
        { useDefaultWhenEmpty: true },
      ),
    }
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

/** GET /v1/doctor/booking-rules — slot duration and buffer between visits. */
export async function getDoctorBookingRules(): Promise<DoctorBookingRules> {
  try {
    const { data } = await apiClient.get<unknown>(BOOKING_RULES_ENDPOINT)
    return parseBookingRules(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load booking rules'),
      { cause: err },
    )
  }
}

/** PUT /v1/doctor/booking-rules */
export async function updateDoctorBookingRules(
  payload: DoctorBookingRulesUpdateRequest,
): Promise<DoctorBookingRules> {
  try {
    const { data } = await apiClient.put<unknown>(BOOKING_RULES_ENDPOINT, {
      slot_duration_minutes: coerceSlotDurationMinutes(
        payload.slot_duration_minutes,
        30,
      ),
      buffer_between_visits_minutes: coerceBufferMinutes(
        payload.buffer_between_visits_minutes,
        10,
      ),
    })
    return parseBookingRules(data)
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to update booking rules'),
      { cause: err },
    )
  }
}

export async function getDoctorAvailability(
  doctorId: string,
  profileTimezone?: string,
): Promise<DoctorAvailability> {
  const base = createDefaultAvailability(profileTimezone)

  try {
    const [availabilityResult, bookingRulesResult] = await Promise.allSettled([
      fetchDoctorAvailabilitySchedule(doctorId),
      getDoctorBookingRules(),
    ])

    if (availabilityResult.status === 'rejected') {
      throw availabilityResult.reason
    }

    const response = availabilityResult.value
    let availability = availabilityFromApiResponse(response, base)

    if (bookingRulesResult.status === 'fulfilled') {
      const rules = bookingRulesResult.value
      availability = {
        ...availability,
        slotDurationMinutes: rules.slot_duration_minutes,
        bufferMinutes: rules.buffer_between_visits_minutes,
      }
    }

    const timezone =
      profileTimezone?.trim() ||
      availability.timezone ||
      DEFAULT_PROFILE_TIMEZONE
    const fromApi = parseAvailableWeekStartsFromApi(
      availabilityResult.value.available_weeks,
    )
    const draft = readAvailabilityDraft()

    const withProfileTimezone: DoctorAvailability = {
      ...availability,
      timezone,
      selectedWeekStarts:
        fromApi !== undefined
          ? fromApi
          : draft?.selectedWeekStarts?.length
            ? sortWeekStarts(draft.selectedWeekStarts)
            : availability.selectedWeekStarts,
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
  doctorId: string | undefined,
  availability: DoctorAvailability,
): Promise<DoctorAvailability> {
  const body = availabilityToApiRequest(availability)

  try {
    const bookingRules = await updateDoctorBookingRules({
      slot_duration_minutes: availability.slotDurationMinutes,
      buffer_between_visits_minutes: availability.bufferMinutes,
    })

    const response = await setDoctorAvailability(
      {
        ...body,
        slot_duration_minutes: bookingRules.slot_duration_minutes,
        buffer_between_visits_minutes: bookingRules.buffer_between_visits_minutes,
      },
      doctorId,
    )
    const saved = availabilityFromApiResponse(response, availability)
    const withProfileTimezone: DoctorAvailability = {
      ...saved,
      timezone: availability.timezone,
      slotDurationMinutes: bookingRules.slot_duration_minutes,
      bufferMinutes: bookingRules.buffer_between_visits_minutes,
      bookingWindowDays: availability.bookingWindowDays,
      selectedWeekStarts: resolveSelectedWeekStartsAfterSave(
        response,
        saved,
        availability,
      ),
      exceptions: availability.exceptions,
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
