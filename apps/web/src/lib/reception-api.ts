import { apiRequest } from './api';
import type { Appointment, AppointmentStatus } from './types';

export const receptionApi = {
  // For a RECEPTIONIST caller, the backend's listMine returns every
  // appointment in their own hospital (not just their own), with both
  // `patient` and `doctor` included — see appointments.service.ts.
  listAppointments: () => apiRequest<Appointment[]>('/appointments/mine'),

  updateAppointmentStatus: (id: string, status: AppointmentStatus) =>
    apiRequest<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
};
