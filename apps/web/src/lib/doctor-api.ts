import { apiRequest } from './api';
import type { Appointment, Doctor, Medicine, LabTest, AppointmentStatus } from './types';

export interface AvailabilitySlot {
  id?: string;
  weekday: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  slotMins: number;
}

export interface PrescriptionItemInput {
  medicineId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface CreateMedicalRecordInput {
  appointmentId: string;
  heightCm?: number;
  weightKg?: number;
  bloodPressure?: string;
  pulseBpm?: number;
  temperatureC?: number;
  diagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
  prescriptionItems?: PrescriptionItemInput[];
  labTestIds?: string[];
}

export const doctorApi = {
  getMyProfile: () => apiRequest<Doctor>('/doctors/me'),

  getAvailability: (doctorId: string) =>
    apiRequest<AvailabilitySlot[]>(`/doctors/${doctorId}/availability`),

  // POST /doctors/me/availability REPLACES the doctor's entire weekly
  // template — this is intentional (see backend's SetAvailabilityDto
  // comment), not a bug if a previously-saved day disappears when omitted.
  setAvailability: (slots: AvailabilitySlot[]) =>
    apiRequest<AvailabilitySlot[]>('/doctors/me/availability', {
      method: 'POST',
      body: { slots: slots.map(({ weekday, startTime, endTime, slotMins }) => ({ weekday, startTime, endTime, slotMins })) },
    }),

  // Same /appointments/mine endpoint the patient portal uses — for a
  // DOCTOR caller the backend includes `patient`, not `doctor`.
  listAppointments: () => apiRequest<Appointment[]>('/appointments/mine'),

  updateAppointmentStatus: (id: string, status: AppointmentStatus) =>
    apiRequest<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),

  listMedicines: () => apiRequest<Medicine[]>('/medicines'),

  listLabTests: () => apiRequest<LabTest[]>('/lab-tests'),

  createMedicalRecord: (input: CreateMedicalRecordInput) =>
    apiRequest<{ id: string }>('/medical-records', { method: 'POST', body: input }),
};
