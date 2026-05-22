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

/** UI model — booking rules kept locally; weekly slots sync with the API. */
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
  slots: ApiAvailabilitySlot[]
}

export type DoctorAvailabilitySetRequest = {
  slots: Array<{
    weekday: number
    start_time: string
    end_time: string
    is_available?: boolean
  }>
}
