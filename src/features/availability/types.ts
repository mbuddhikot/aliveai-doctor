export type WeekdayId =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type ConsultationMode = 'video' | 'clinic' | 'home'

export type AvailabilitySlot = {
  id: string
  start: string
  end: string
  modes: ConsultationMode[]
}

export type DayAvailability = {
  id: WeekdayId
  label: string
  enabled: boolean
  slots: AvailabilitySlot[]
}

export type AvailabilityException = {
  id: string
  date: string
  reason: string
  unavailable: boolean
}

export type AvailabilityWeekOption = {
  weekStart: string
  label: string
}

/** GET /v1/doctors/{doctor_id}/availability — one bookable calendar week. */
export type ApiAvailableWeek = {
  week_start: string
  week_end: string
}

/** POST /v1/doctor/availability — Monday yyyy-MM-dd for each selected week. */
export type ApiAvailableWeekInput = {
  week_start: string
}

/** UI model — loaded from GET /v1/doctors/{doctor_id}/availability. */
export type DoctorAvailability = {
  timezone: string
  slotDurationMinutes: number
  bufferMinutes: number
  bookingWindowDays: number
  /** Monday date keys (yyyy-MM-dd) synced via availability API `available_weeks`. */
  selectedWeekStarts: string[]
  weekly: DayAvailability[]
  exceptions: AvailabilityException[]
  updatedAt?: string
}

/** Backend: 0 = Monday … 6 = Sunday */
export type ApiAvailabilitySlot = {
  weekday: number
  start_time: string
  end_time: string
  is_available: boolean
}

/**
 * GET /v1/doctors/{doctor_id}/availability and POST /v1/doctor/availability response.
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/get_doctor_availability_v1_doctors__doctor_id__availability_get
 */
export type DoctorAvailabilityResponse = {
  doctor_id: string
  slot_duration_minutes: number
  buffer_between_visits_minutes: number
  slots: ApiAvailabilitySlot[]
  /** Mon–Sun bookable weeks; empty = no week filter. */
  available_weeks: ApiAvailableWeek[]
}

/**
 * POST /v1/doctor/availability — replaces weekly slots, booking rules, and available weeks.
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/set_doctor_availability_v1_doctor_availability_post
 */
export type DoctorAvailabilitySetRequest = {
  /** Stored as doctors.session_minutes (15 | 20 | 30 | 45 | 60). */
  slot_duration_minutes?: number
  /** Stored as doctors.visit_buffer_minutes (0 | 5 | 10 | 15 | 20). */
  buffer_between_visits_minutes?: number
  slots: Array<{
    weekday: number
    start_time: string
    end_time: string
    is_available?: boolean
  }>
  /** Empty list = no week filter (any future day matching weekday slots). */
  available_weeks?: ApiAvailableWeekInput[]
}

/** GET/PUT /v1/doctor/booking-rules */
export type DoctorBookingRules = {
  slot_duration_minutes: number
  buffer_between_visits_minutes: number
}

export type DoctorBookingRulesUpdateRequest = DoctorBookingRules
