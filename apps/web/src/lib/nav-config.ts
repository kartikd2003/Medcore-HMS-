import type { Role } from './types';

export interface NavItem {
  label: string;
  href: string;
}

/**
 * Sidebar items per role. Some hrefs point at pages that don't exist
 * yet — defining the full intended structure now means each portal
 * gets built into a nav that already makes sense, rather than
 * retrofitting navigation after the fact.
 */
export const ROLE_NAV: Record<Role, NavItem[]> = {
  PATIENT: [
    { label: 'Appointments', href: '/patient/appointments' },
    { label: 'Find a doctor', href: '/patient/book' },
    { label: 'Medical records', href: '/patient/records' },
    { label: 'Prescriptions', href: '/patient/prescriptions' },
    { label: 'Invoices', href: '/patient/invoices' },
  ],
  DOCTOR: [
    { label: "Today's queue", href: '/doctor' },
    { label: 'Availability', href: '/doctor/availability' },
  ],
  RECEPTIONIST: [
    { label: 'Schedule', href: '/reception' },
  ],
  PHARMACIST: [
    { label: 'Dispense queue', href: '/pharmacy' },
    { label: 'Inventory', href: '/pharmacy/inventory' },
  ],
  LAB_TECHNICIAN: [
    { label: 'Lab queue', href: '/lab' },
    { label: 'Test catalog', href: '/lab/tests' },
  ],
  ACCOUNTANT: [
    { label: 'Invoices', href: '/billing' },
  ],
  HOSPITAL_ADMIN: [
    { label: 'Staff', href: '/admin/staff' },
  ],
  SUPER_ADMIN: [
    { label: 'Hospitals', href: '/admin/hospitals' },
  ],
  NURSE: [{ label: "Today's schedule", href: '/nurse' }],
};
