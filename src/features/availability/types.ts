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

/** UI model — weekly slots via availability API; slot/buffer via booking-rules API. */
export type DoctorAvailability = {
  timezone: string
  slotDurationMinutes: number
  bufferMinutes: number
  bookingWindowDays: number
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

export type DoctorAvailabilityResponse = {
  doctor_id: string
  slot_duration_minutes?: number
  buffer_between_visits_minutes?: number
  slots: ApiAvailabilitySlot[]
}

/**
 * POST /v1/doctor/availability — replaces the doctor's weekly schedule.
 * @see https://aliveai-backend-api-927940582634.us-central1.run.app/docs#/appointments/set_doctor_availability_v1_doctor_availability_post
 */
export type DoctorAvailabilitySetRequest = {
  /** Optional on API; slot/buffer are also saved via PUT /v1/doctor/booking-rules. */
  slot_duration_minutes?: number
  buffer_between_visits_minutes?: number
  slots: Array<{
    weekday: number
    start_time: string
    end_time: string
    is_available?: boolean
  }>
}

/** GET/PUT /v1/doctor/booking-rules */
export type DoctorBookingRules = {
  slot_duration_minutes: number
  buffer_between_visits_minutes: number
}

export type DoctorBookingRulesUpdateRequest = DoctorBookingRules
