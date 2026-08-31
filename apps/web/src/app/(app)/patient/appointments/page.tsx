'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { patientApi } from '@/lib/patient-api';
import { ApiError } from '@/lib/api';
import type { Appointment } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';

// Only these statuses can move to CANCELLED — mirrors
// ALLOWED_TRANSITIONS in the backend's appointments.service.ts, so
// the button only appears when the call would actually succeed.
const CANCELLABLE = new Set(['PENDING', 'CONFIRMED']);

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setAppointments(await patientApi.listAppointments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your appointments.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await patientApi.cancelAppointment(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel that appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="px-8 py-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Your appointments" description="Everything you've booked, past and upcoming." />
        <Link
          href="/patient/book"
          className="shrink-0 rounded bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600 transition-colors"
        >
          Book a doctor
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {appointments === null && !error && <LoadingBlock />}

      {appointments && appointments.length === 0 && (
        <EmptyState
          title="No appointments yet"
          hint="Book a doctor to see your appointments listed here."
        />
      )}

      {appointments && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card key={appt.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  Dr. {appt.doctor?.user?.firstName} {appt.doctor?.user?.lastName}
                </p>
                <p className="text-sm text-ink-soft font-mono mt-0.5">{formatDateTime(appt.scheduledAt)}</p>
                {appt.reason && <p className="text-sm text-ink-soft mt-1">{appt.reason}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={appt.status} />
                {CANCELLABLE.has(appt.status) && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    disabled={cancellingId === appt.id}
                    className="text-sm text-clay-500 hover:text-clay-600 disabled:opacity-50 transition-colors"
                  >
                    {cancellingId === appt.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
