import { apiRequest } from './api';
import type { Hospital } from './types';

/**
 * Verified against the real backend controller (HospitalsController,
 * built earlier in this project). Two things worth knowing:
 *
 *  - Onboarding a hospital and creating its first Hospital Admin
 *    happen together, atomically, in one call — a hospital with no
 *    admin could never be logged into, so the backend doesn't allow
 *    creating one without the other.
 *  - New hospitals start PENDING_VERIFICATION, not immediately usable
 *    — a separate activate call is required before staff can log in
 *    to it. There's no single "isActive" toggle; status is a
 *    three-state enum (PENDING_VERIFICATION / ACTIVE / SUSPENDED),
 *    with activate/suspend as two distinct endpoints.
 */
export interface CreateHospitalInput {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  adminEmail: string;
  adminTemporaryPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export const superAdminApi = {
  listHospitals: () => apiRequest<Hospital[]>('/hospitals'),

  createHospital: (input: CreateHospitalInput) =>
    apiRequest<{ hospital: Hospital; admin: { id: string; email: string } }>('/hospitals', {
      method: 'POST',
      body: input,
    }),

  activate: (id: string) => apiRequest<Hospital>(`/hospitals/${id}/activate`, { method: 'PATCH' }),
  suspend: (id: string) => apiRequest<Hospital>(`/hospitals/${id}/suspend`, { method: 'PATCH' }),
};
