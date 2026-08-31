'use client';

import { useEffect, useState } from 'react';
import { patientApi, type PrescriptionSummary } from '@/lib/patient-api';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    patientApi
      .listPrescriptions()
      .then(setPrescriptions)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your prescriptions.'));
  }, []);

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Prescriptions"
        description="Each item shows whether it's been picked up from the pharmacy yet."
      />

      {error && <ErrorNotice message={error} />}
      {prescriptions === null && !error && <LoadingBlock />}

      {prescriptions && prescriptions.length === 0 && (
        <EmptyState title="No prescriptions yet" hint="These come from your doctor after a visit." />
      )}

      {prescriptions && prescriptions.length > 0 && (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <p className="text-xs text-ink-soft font-mono mb-3">{formatDate(rx.createdAt)}</p>
              <div className="space-y-2">
                {rx.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-line last:border-0 pb-2 last:pb-0"
                  >
                    <div>
                      <p className="text-sm text-ink">
                        {item.medicine.name} {item.medicine.strength}
                      </p>
                      <p className="text-xs text-ink-soft font-mono mt-0.5">
                        {item.dosage} · {item.frequency} · {item.durationDays}d
                      </p>
                      {item.instructions && (
                        <p className="text-xs text-ink-soft mt-0.5">{item.instructions}</p>
                      )}
                    </div>
                    <StatusBadge status={item.dispensedAt ? 'DISPENSED' : 'NOT_DISPENSED'} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
