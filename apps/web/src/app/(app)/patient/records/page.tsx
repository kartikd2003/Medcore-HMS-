'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { patientApi, type MedicalRecordSummary } from '@/lib/patient-api';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';

export default function PatientRecordsPage() {
  const [records, setRecords] = useState<MedicalRecordSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    patientApi
      .listRecords()
      .then(setRecords)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your records.'));
  }, []);

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader title="Medical records" description="Notes from each completed visit." />

      {error && <ErrorNotice message={error} />}
      {records === null && !error && <LoadingBlock />}

      {records && records.length === 0 && (
        <EmptyState title="No records yet" hint="A record appears here once a doctor completes a visit." />
      )}

      {records && records.length > 0 && (
        <div className="space-y-3">
          {records.map((record) => (
            <Link key={record.id} href={`/patient/records/${record.id}`}>
              <Card className="hover:border-sage-500 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {record.diagnosis || 'Consultation notes'}
                    </p>
                    <p className="text-sm text-ink-soft mt-0.5">
                      Dr. {record.doctor?.user?.firstName} {record.doctor?.user?.lastName} ·{' '}
                      <span className="font-mono">{formatDate(record.createdAt)}</span>
                    </p>
                  </div>
                  <span className="text-sage-500 text-sm shrink-0">View →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
