import { apiRequest } from './api';
import type { Invoice } from './types';

/**
 * Verified against the real backend controller (InvoicesController,
 * built earlier in this project). Two things worth knowing:
 *
 *  - GET /invoices/mine is PATIENT-only — an accountant calling it
 *    gets a 403. The real hospital-wide list is the separate
 *    GET /invoices endpoint.
 *  - There's no generic status-change endpoint. PENDING -> PAID is
 *    the only transition the backend exposes (PATCH /invoices/:id/pay);
 *    DRAFT/VOID/REFUNDED/PARTIALLY_PAID have no supporting endpoints
 *    at all today, so this file doesn't offer them as actions.
 *  - Neither GET /invoices nor GET /invoices/:id include patient
 *    details in their response (just the invoice + line items) — the
 *    backend doesn't currently join that in. Patient identification
 *    on this page is limited to whatever ties back through the
 *    appointment/generate flow until that's added.
 */
export const accountantApi = {
  listInvoices: () => apiRequest<Invoice[]>('/invoices'),

  generate: (appointmentId: string, consultationFee: number) =>
    apiRequest<Invoice>('/invoices/generate', {
      method: 'POST',
      body: { appointmentId, consultationFee },
    }),

  markPaid: (id: string, paymentGatewayRef?: string) =>
    apiRequest<Invoice>(`/invoices/${id}/pay`, {
      method: 'PATCH',
      body: paymentGatewayRef ? { paymentGatewayRef } : {},
    }),
};
