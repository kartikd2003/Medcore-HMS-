import { apiRequest } from './api';
import type { LabTest, LabOrderStatus } from './types';

/**
 * Verified against the real backend controllers (built earlier in
 * this project) — see LabOrdersController and LabTestsController.
 */
export interface LabOrderQueueItem {
  id: string;
  status: LabOrderStatus;
  resultFileUrl: string | null;
  resultData: unknown;
  createdAt: string;
  labTest: { id: string; name: string; code: string | null; turnaroundHrs: number | null };
  medicalRecord?: {
    patient?: { user?: { firstName: string; lastName: string } };
  };
}

export const labApi = {
  // Real endpoint: GET /lab-orders (LAB_TECHNICIAN, HOSPITAL_ADMIN),
  // hospital-wide queue, not a per-user "mine" endpoint — /lab-orders/mine
  // doesn't exist on the backend at all. Optional status filter.
  listQueue: (status?: LabOrderStatus) =>
    apiRequest<LabOrderQueueItem[]>(status ? `/lab-orders?status=${status}` : '/lab-orders'),

  listTests: () => apiRequest<LabTest[]>('/lab-tests'),

  // Real path: PATCH /lab-orders/:id/collect
  collectSample: (id: string) =>
    apiRequest<LabOrderQueueItem>(`/lab-orders/${id}/collect`, { method: 'PATCH' }),

  // Real path: PATCH /lab-orders/:id/result
  uploadResult: (id: string, input: { resultData?: unknown; resultFileUrl?: string }) =>
    apiRequest<LabOrderQueueItem>(`/lab-orders/${id}/result`, {
      method: 'PATCH',
      body: input,
    }),

  // The backend has two separate endpoints for this, neither taking a
  // body — not one generic /status mutation.
  approve: (id: string) => apiRequest<LabOrderQueueItem>(`/lab-orders/${id}/approve`, { method: 'PATCH' }),
  reject: (id: string) => apiRequest<LabOrderQueueItem>(`/lab-orders/${id}/reject`, { method: 'PATCH' }),
};
