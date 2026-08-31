'use client';

import { useEffect, useMemo, useState } from 'react';
import { accountantApi } from '@/lib/accountant-api';
import { ApiError } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';
import type { Invoice } from '@/lib/types';

const SOURCE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consultation',
  LAB: 'Lab',
  PHARMACY: 'Pharmacy',
  ROOM: 'Room',
  OTHER: 'Other',
};

const FILTERS: { label: string; value: 'UNPAID' | 'ALL' }[] = [
  { label: 'Unpaid', value: 'UNPAID' },
  { label: 'All', value: 'ALL' },
];

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'UNPAID' | 'ALL'>('UNPAID');

  const load = async () => {
    try {
      setInvoices(await accountantApi.listInvoices());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load invoices.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkPaid = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await accountantApi.markPaid(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark that invoice paid.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(
    () => (invoices ?? []).filter((inv) => filter === 'ALL' || inv.status !== 'PAID'),
    [invoices, filter],
  );

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader title="Invoices" description="Hospital-wide billing across all patients." />

      <div className="flex items-center gap-4 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-sm ${
              filter === f.value ? 'text-sage-700 font-medium' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {invoices === null && !error && <LoadingBlock />}

      {invoices && visible.length === 0 && (
        <EmptyState title="Nothing here" hint="Try the All filter." />
      )}

      {visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((invoice) => {
            const busy = busyId === invoice.id;
            // The backend's pay() rejects only PAID and VOID — every
            // other status (PENDING, DRAFT, PARTIALLY_PAID) is payable.
            const canMarkPaid = invoice.status !== 'PAID' && invoice.status !== 'VOID';

            return (
              <Card key={invoice.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    {/* The invoice list/detail endpoints don't currently
                        include patient details — identifying by the
                        source appointment until that's added. */}
                    <p className="text-sm font-medium text-ink font-mono">
                      Appointment {invoice.appointmentId.slice(0, 8)}
                    </p>
                    <p className="text-xs font-mono text-ink-soft mt-0.5">
                      {invoice.paidAt ? formatDate(invoice.paidAt) : 'Unpaid'}
                    </p>
                  </div>
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
                {canMarkPaid && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
                    <button
                      onClick={() => handleMarkPaid(invoice.id)}
                      disabled={busy}
                      className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
                    >
                      Mark paid
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
