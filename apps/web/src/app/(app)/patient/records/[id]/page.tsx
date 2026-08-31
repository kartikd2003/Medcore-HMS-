'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { patientApi, type MedicalRecordDetail } from '@/lib/patient-api';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';

function Vital({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-sm font-mono text-ink">{value}</p>
    </div>
  );
}

export default function MedicalRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<MedicalRecordDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    patientApi
      .getRecord(id)
      .then(setRecord)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this record.'));
  }, [id]);

  return (
    <main className="px-8 py-8 max-w-2xl">
      <Link href="/patient/records" className="text-sm text-sage-600 hover:text-sage-700">
        ← Medical records
      </Link>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}
      {!record && !error && <LoadingBlock />}

      {record && (
        <>
          <div className="mt-4">
            <PageHeader
              title={record.diagnosis || 'Consultation notes'}
              description={formatDateTime(record.createdAt)}
            />
          </div>

          <Card className="mb-4">
            <p className="text-sm font-medium text-ink mb-3">Vitals</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              <Vital label="Height" value={record.heightCm ? `${record.heightCm} cm` : null} />
              <Vital label="Weight" value={record.weightKg ? `${record.weightKg} kg` : null} />
              <Vital label="Blood pressure" value={record.bloodPressure} />
              <Vital label="Pulse" value={record.pulseBpm ? `${record.pulseBpm} bpm` : null} />
              <Vital label="Temperature" value={record.temperatureC ? `${record.temperatureC} °C` : null} />
            </div>
          </Card>

          {(record.treatmentPlan || record.notes) && (
            <Card className="mb-4 space-y-3">
              {record.treatmentPlan && (
                <div>
                  <p className="text-sm font-medium text-ink">Treatment plan</p>
                  <p className="text-sm text-ink-soft mt-0.5">{record.treatmentPlan}</p>
                </div>
              )}
              {record.notes && (
                <div>
                  <p className="text-sm font-medium text-ink">Notes</p>
                  <p className="text-sm text-ink-soft mt-0.5">{record.notes}</p>
                </div>
              )}
            </Card>
          )}

          {record.prescription && record.prescription.items.length > 0 && (
            <Card className="mb-4">
              <p className="text-sm font-medium text-ink mb-3">Prescription</p>
              <div className="space-y-2">
                {record.prescription.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-line last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm text-ink">
                        {item.medicine.name} {item.medicine.strength}
                      </p>
                      <p className="text-xs text-ink-soft font-mono mt-0.5">
                        {item.dosage} · {item.frequency} · {item.durationDays}d
                      </p>
                    </div>
                    <StatusBadge status={item.dispensedAt ? 'DISPENSED' : 'NOT_DISPENSED'} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {record.labOrders.length > 0 && (
            <Card>
              <p className="text-sm font-medium text-ink mb-3">Lab orders</p>
              <div className="space-y-2">
                {record.labOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b border-line last:border-0 pb-2 last:pb-0">
                    <p className="text-sm text-ink">{order.labTest.name}</p>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
