'use client';

import { useEffect, useMemo, useState } from 'react';
import { pharmacyApi, type PharmacyPrescriptionItem } from '@/lib/pharmacy-api';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';

export default function PharmacyQueuePage() {
  const [items, setItems] = useState<PharmacyPrescriptionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    try {
      setItems(await pharmacyApi.listQueue());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load the dispense queue.',
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDispense = async (itemId: string) => {
    setBusyId(itemId);
    setError(null);
    try {
      await pharmacyApi.dispenseItem(itemId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark that item dispensed.');
    } finally {
      setBusyId(null);
    }
  };

  // Group flat items by prescription so each card reads as "one
  // patient's prescription", not a flat list of unrelated pills.
  const groups = useMemo(() => {
    const byPrescription = new Map<string, PharmacyPrescriptionItem[]>();
    for (const item of items ?? []) {
      const list = byPrescription.get(item.prescription.id) ?? [];
      list.push(item);
      byPrescription.set(item.prescription.id, list);
    }
    return Array.from(byPrescription.values())
      .filter((group) => showAll || group.some((i) => !i.dispensedAt))
      .sort(
        (a, b) =>
          new Date(b[0].prescription.createdAt).getTime() -
          new Date(a[0].prescription.createdAt).getTime(),
      );
  }, [items, showAll]);

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Dispense queue"
        description="Prescription items waiting to be handed to a patient."
      />

      <label className="flex items-center gap-2 text-sm text-ink-soft mb-6">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Show fully-dispensed prescriptions too
      </label>

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {items === null && !error && <LoadingBlock />}

      {items && groups.length === 0 && (
        <EmptyState title="Nothing to dispense" hint="New prescriptions will show up here." />
      )}

      {groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => {
            const first = group[0];
            const patientName = first.prescription.medicalRecord?.patient?.user
              ? `${first.prescription.medicalRecord.patient.user.firstName} ${first.prescription.medicalRecord.patient.user.lastName}`
              : 'Unknown patient';

            return (
              <Card key={first.prescription.id}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ink">{patientName}</p>
                  <p className="text-xs font-mono text-ink-soft">
                    {formatDate(first.prescription.createdAt)}
                  </p>
                </div>
                <div className="space-y-2">
                  {group.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 border-t border-line pt-2 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          {item.medicine.name}
                          {item.medicine.strength && ` · ${item.medicine.strength}`}
                          {item.medicine.form && ` · ${item.medicine.form}`}
                        </p>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {item.dosage} · {item.frequency} · {item.durationDays}d
                          {item.instructions && ` · ${item.instructions}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={item.dispensedAt ? 'DISPENSED' : 'NOT_DISPENSED'} />
                        {!item.dispensedAt && (
                          <button
                            onClick={() => handleDispense(item.id)}
                            disabled={busyId === item.id}
                            className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
                          >
                            Mark dispensed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
