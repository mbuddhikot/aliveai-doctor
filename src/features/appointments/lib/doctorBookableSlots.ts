import type { DoctorBookableSlot, DoctorBookableSlotPeriod } from '../types'

export const SLOT_PERIOD_ORDER: DoctorBookableSlotPeriod[] = [
  'Morning',
  'Afternoon',
  'Evening',
]

function normalizeTimeHHMM(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.slice(0, 5)
}

/** API returns `morning | afternoon | evening`; UI uses title case labels. */
export function normalizeBookableSlotPeriod(period: unknown): string {
  const raw = String(period ?? '').trim().toLowerCase()
  if (raw === 'morning') return 'Morning'
  if (raw === 'afternoon') return 'Afternoon'
  if (raw === 'evening') return 'Evening'
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function normalizeDoctorBookableSlot(
  item: Record<string, unknown>,
): DoctorBookableSlot | null {
  const time = normalizeTimeHHMM(item.time)
  const period = normalizeBookableSlotPeriod(item.period)
  if (!time || !period) return null

  return {
    time,
    period,
    available: item.available === true,
  }
}

export function normalizeDoctorBookableSlots(data: unknown): DoctorBookableSlot[] {
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as Record<string, unknown>).data)
      ? ((data as Record<string, unknown>).data as unknown[])
      : typeof data === 'object' &&
          data !== null &&
          Array.isArray((data as Record<string, unknown>).slots)
        ? ((data as Record<string, unknown>).slots as unknown[])
        : []

  return list
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(normalizeDoctorBookableSlot)
    .filter((slot): slot is DoctorBookableSlot => slot !== null)
}

export function groupAvailableDoctorBookableSlots(
  slots: DoctorBookableSlot[],
): Array<{ period: string; slots: DoctorBookableSlot[] }> {
  const byPeriod = new Map<string, DoctorBookableSlot[]>()

  for (const slot of slots) {
    if (!slot.available) continue
    const list = byPeriod.get(slot.period) ?? []
    list.push(slot)
    byPeriod.set(slot.period, list)
  }

  for (const list of byPeriod.values()) {
    list.sort((a, b) => a.time.localeCompare(b.time))
  }

  const orderedPeriods = [
    ...SLOT_PERIOD_ORDER.filter((period) => byPeriod.has(period)),
    ...[...byPeriod.keys()].filter(
      (period) => !SLOT_PERIOD_ORDER.includes(period as DoctorBookableSlotPeriod),
    ),
  ]

  return orderedPeriods.map((period) => ({
    period,
    slots: byPeriod.get(period) ?? [],
  }))
}

export function countAvailableDoctorBookableSlots(
  slots: DoctorBookableSlot[],
): number {
  return slots.filter((slot) => slot.available).length
}
