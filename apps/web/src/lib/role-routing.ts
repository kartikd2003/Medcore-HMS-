import type { Role } from './types';

/**
 * Where each role lands after login. Updated as each portal gets
 * built, so nobody has to go hunting through login/redirect logic
 * later — PATIENT is the first one wired up; every other role still
 * falls through to the generic placeholder until its portal exists.
 */
export function roleHomePath(role: Role): string {
  if (role === 'PATIENT') return '/patient/appointments';
  if (role === 'DOCTOR') return '/doctor';
  if (role === 'RECEPTIONIST') return '/reception';
  if (role === 'PHARMACIST') return '/pharmacy';
  if (role === 'LAB_TECHNICIAN') return '/lab';
  if (role === 'ACCOUNTANT') return '/billing';
  if (role === 'HOSPITAL_ADMIN') return '/admin/staff';
  if (role === 'SUPER_ADMIN') return '/admin/hospitals';
  if (role === 'NURSE') return '/nurse';
  return '/dashboard';
}
