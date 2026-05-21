import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import { normalizeAppointmentList } from '../lib/normalizeAppointment'
import type {
  AppointmentListResponse,
  ApproveAppointmentPayload,
  DoctorAppointment,
  RejectAppointmentPayload,
  RescheduleAppointmentPayload,
} from '../types'

export const DOCTOR_APPOINTMENTS_QUERY_KEY = 'doctor-appointments'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function listDoctorAppointments(params: {
  doctorId: string
  status?: string
}): Promise<AppointmentListResponse> {
  try {
    const { data } = await apiClient.get<unknown>('/v1/doctor/appointments', {
      params: {
        doctor_id: params.doctorId,
        ...(params.status ? { status: params.status } : {}),
      },
    })
    const appointments = normalizeAppointmentList(data)
    const total =
      isRecord(data) && typeof data.total === 'number'
        ? data.total
        : appointments.length
    return {
      data: appointments,
      total,
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load appointments'),
      { cause: err },
    )
  }
}

export async function approveDoctorAppointment(params: {
  appointmentId: string
  doctorId: string
  payload?: ApproveAppointmentPayload
}): Promise<DoctorAppointment> {
  try {
    const { data } = await apiClient.put<DoctorAppointment>(
      `/v1/doctor/appointments/${params.appointmentId}/approve`,
      params.payload ?? {},
      { params: { doctor_id: params.doctorId } },
    )
    return data
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to approve appointment'),
      { cause: err },
    )
  }
}

export async function rejectDoctorAppointment(params: {
  appointmentId: string
  doctorId: string
  payload: RejectAppointmentPayload
}): Promise<DoctorAppointment> {
  try {
    const { data } = await apiClient.put<DoctorAppointment>(
      `/v1/doctor/appointments/${params.appointmentId}/reject`,
      params.payload,
      { params: { doctor_id: params.doctorId } },
    )
    return data
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to reject appointment'),
      { cause: err },
    )
  }
}

export async function rescheduleDoctorAppointment(params: {
  appointmentId: string
  doctorId: string
  payload: RescheduleAppointmentPayload
}): Promise<DoctorAppointment> {
  try {
    const { data } = await apiClient.put<DoctorAppointment>(
      `/v1/doctor/appointments/${params.appointmentId}/reschedule`,
      params.payload,
      { params: { doctor_id: params.doctorId } },
    )
    return data
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to reschedule appointment'),
      { cause: err },
    )
  }
}
