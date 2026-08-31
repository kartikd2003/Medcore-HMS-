import { apiRequest } from './api';
import type { Role } from './types';

/**
 * Verified against the real backend controller (UsersController,
 * built earlier in this project). Two real limits worth knowing,
 * not frontend bugs to work around:
 *
 *  - There is no reactivation endpoint. DELETE /users/:id deactivates
 *    a staff member (soft — sets isActive: false, doesn't remove the
 *    row) and that's a one-way door on the backend as it stands today.
 *    Reversing it would need a new endpoint; this file doesn't pretend
 *    one exists.
 *  - There is no role-change endpoint. A staff member's role is fixed
 *    at creation; changing it isn't supported anywhere in the backend.
 */
export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
}

export interface CreateStaffInput {
  email: string;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Exclude<Role, 'PATIENT' | 'SUPER_ADMIN'>;
}

// A hospital admin provisions staff, not patients or other super
// admins — matches the backend's CreateStaffDto role exclusion exactly.
export const ASSIGNABLE_ROLES: Exclude<Role, 'PATIENT' | 'SUPER_ADMIN'>[] = [
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'LAB_TECHNICIAN',
  'PHARMACIST',
  'ACCOUNTANT',
  'HOSPITAL_ADMIN',
];

export const adminApi = {
  // Real path needs the admin's own hospitalId — pass it from the
  // logged-in user (AuthUser.hospitalId), not a hardcoded value.
  listStaff: (hospitalId: string) =>
    apiRequest<StaffMember[]>(`/users/hospital/${hospitalId}`),

  createStaff: (input: CreateStaffInput) =>
    apiRequest<StaffMember>('/users/staff', { method: 'POST', body: input }),

  // One-way: deactivates only. See the file comment above.
  deactivate: (id: string) => apiRequest<StaffMember>(`/users/${id}`, { method: 'DELETE' }),
};
