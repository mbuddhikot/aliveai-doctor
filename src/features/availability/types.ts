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

export type DoctorAvailability = {
  timezone: string
  slotDurationMinutes: number
  bufferMinutes: number
  bookingWindowDays: number
  weekly: DayAvailability[]
  exceptions: AvailabilityException[]
  updatedAt?: string
}
