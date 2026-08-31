import { apiRequest } from './api';
import type { Appointment } from './types';

/**
 * Verified: GET /appointments/mine has no @Roles() restriction on the
 * backend, so it's reachable by any authenticated staff member. For
 * any role other than PATIENT or DOCTOR (including NURSE), the
 * service falls through to "every appointment in your hospital" — the
 * same view a receptionist gets.
 *
 * There is no other NURSE-specific capability on the backend today.
 * A previous pass proposed pre-consult vitals intake as a plausible
 * next feature, but its endpoint doesn't exist — see the page
 * component's comment for the real state of that idea.
 */
export const nurseApi = {
  listQueue: () => apiRequest<Appointment[]>('/appointments/mine'),
};
