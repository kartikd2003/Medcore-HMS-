import { apiRequest } from './api';
import type { Medicine } from './types';

/**
 * Verified against the real backend controllers (built earlier in
 * this project) — see PrescriptionsController and MedicinesController.
 */
export interface PharmacyPrescriptionItem {
  id: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
  dispensedAt: string | null;
  medicine: { id: string; name: string; form: string | null; strength: string | null };
  prescription: {
    id: string;
    createdAt: string;
    medicalRecord?: {
      patient?: { user?: { firstName: string; lastName: string } };
    };
  };
}

export const pharmacyApi = {
  // Real endpoint: GET /prescriptions/pending (PHARMACIST, HOSPITAL_ADMIN).
  // /prescriptions/mine is PATIENT-only — a pharmacist calling it gets a 403.
  listQueue: () => apiRequest<PharmacyPrescriptionItem[]>('/prescriptions/pending'),

  // Real path: PATCH /prescriptions/items/:itemId/dispense
  dispenseItem: (itemId: string) =>
    apiRequest<PharmacyPrescriptionItem>(`/prescriptions/items/${itemId}/dispense`, {
      method: 'PATCH',
    }),

  listMedicines: () => apiRequest<Medicine[]>('/medicines'),

  /**
   * Real endpoint: PATCH /medicines/:id/stock — and it's delta-based,
   * not absolute. The backend applies `stockQty: { increment: delta }`
   * inside a transaction specifically so two concurrent stock
   * adjustments can't silently overwrite each other. Pass a positive
   * delta to receive stock, negative to correct downward.
   */
  adjustStock: (id: string, delta: number) =>
    apiRequest<Medicine>(`/medicines/${id}/stock`, { method: 'PATCH', body: { delta } }),
};
