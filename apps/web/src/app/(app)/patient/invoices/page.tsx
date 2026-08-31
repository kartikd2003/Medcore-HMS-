'use client';

import { useEffect, useState } from 'react';
import { patientApi } from '@/lib/patient-api';
import { ApiError } from '@/lib/api';
import type { Invoice } from '@/lib/types';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';

const SOURCE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consultation',
  LAB: 'Lab',
  PHARMACY: 'Pharmacy',
  ROOM: 'Room',
  OTHER: 'Other',
};

export default function PatientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    patientApi
      .listInvoices()
      .then(setInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your invoices.'));
  }, []);

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader title="Invoices" />

      <Card className="mb-6 !bg-amber-50 border-amber-400/40">
        <p className="text-sm text-ink">
          These are view-only for now — the backend doesn&apos;t have an endpoint yet for a patient
          to pay online. Payment is currently recorded in person by billing staff.
        </p>
      </Card>

      {error && <ErrorNotice message={error} />}
      {invoices === null && !error && <LoadingBlock />}

      {invoices && invoices.length === 0 && (
        <EmptyState title="No invoices yet" />
      )}

      {invoices && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-mono text-ink-soft">
                  {invoice.paidAt ? formatDate(invoice.paidAt) : 'Unpaid'}
                </p>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="space-y-1.5 mb-3">
                {invoice.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <p className="text-ink-soft">
                      {SOURCE_LABELS[item.source] ?? item.source} — {item.description}
                      {item.quantity > 1 && ` × ${item.quantity}`}
                    </p>
                    <p className="font-mono text-ink">{formatMoney(item.lineTotal, invoice.currency)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <p className="text-sm font-medium text-ink">Total</p>
                <p className="text-sm font-mono font-medium text-ink">
                  {formatMoney(invoice.total, invoice.currency)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
