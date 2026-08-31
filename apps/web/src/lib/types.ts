// Mirrors apps/api/prisma/schema.prisma — kept manually in sync since
// apps/web and apps/api don't share a types package yet (packages/types
// is scaffolded but empty; wiring real type sharing is a later task).

export type Role =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST'
  | 'ACCOUNTANT'
  | 'PATIENT';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type LabOrderStatus = 'ORDERED' | 'SAMPLE_COLLECTED' | 'RESULT_UPLOADED' | 'APPROVED' | 'REJECTED';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' | 'VOID';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  hospitalId: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface Doctor {
  id: string;
  userId: string;
  departmentId: string;
  specialty: string | null;
  user?: { firstName: string; lastName: string; email: string };
}

export interface Slot {
  start: string;
  end: string;
}

export interface Appointment {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  scheduledAt: string;
  durationMins: number;
  status: AppointmentStatus;
  reason: string | null;
  doctor?: Doctor;
  patient?: { user?: { firstName: string; lastName: string } };
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  form: string | null;
  strength: string | null;
  stockQty: number;
  reorderLevel: number;
  unitPrice: string;
}

export interface LabTest {
  id: string;
  name: string;
  code: string | null;
  price: string;
  turnaroundHrs: number | null;
}

export interface Invoice {
  id: string;
  appointmentId: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  paidAt: string | null;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  source: 'CONSULTATION' | 'LAB' | 'PHARMACY' | 'ROOM' | 'OTHER';
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export type HospitalStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  status: HospitalStatus;
  email: string | null;
  phone: string | null;
  address: Address | null;
  createdAt: string;
}
