'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patientApi } from '@/lib/patient-api';
import { ApiError } from '@/lib/api';
import type { Slot } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, EmptyState, ErrorNotice } from '@/components/PortalUI';

/**
 * Real gap in the backend: there's no endpoint for a patient to
 * browse which doctors exist (only GET /doctors/:id/slots for an
 * already-known doctor). Rather than fake a directory with made-up
 * data, this stopgap asks for the doctor's id directly and says so
 * plainly — a real "find a doctor" search is a backend task
 * (something like GET /doctors?department=) that hasn't been built.
 */
export default function BookAppointmentPage() {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [reason, setReason] = useState('');
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSlots(null);
    setSearching(true);
    try {
      const result = await patientApi.getSlots(doctorId.trim(), date);
      setSlots(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not look up slots for that doctor.');
    } finally {
      setSearching(false);
    }
  };

  const handleBook = async (slot: Slot) => {
    setBooking(slot.start);
    setError(null);
    try {
      await patientApi.bookAppointment({
        doctorId: doctorId.trim(),
        scheduledAt: slot.start,
        reason: reason.trim() || undefined,
      });
      router.push('/patient/appointments');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not book that slot.');
      setBooking(null);
    }
  };

  return (
    <main className="px-8 py-8 max-w-2xl">
      <PageHeader title="Book an appointment" />

      <Card className="mb-6 !bg-amber-50 border-amber-400/40">
        <p className="text-sm text-ink">
          There isn&apos;t yet a way to browse doctors by name or specialty here — that directory
          doesn&apos;t exist on the backend yet. For now, enter the doctor&apos;s ID directly (ask
          your clinic for it, or a hospital admin can look it up).
        </p>
      </Card>

      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="doctorId">
            Doctor ID
          </label>
          <input
            id="doctorId"
            required
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            placeholder="e.g. a1b2c3d4-..."
            className="w-full rounded border border-line px-3 py-2 text-sm font-mono focus:border-sage-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="reason">
            Reason for visit <span className="text-ink-soft font-normal">(optional)</span>
          </label>
          <input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Follow-up on blood pressure"
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="rounded bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600 disabled:opacity-50 transition-colors"
        >
          {searching ? 'Searching…' : 'Find open slots'}
        </button>
      </form>

      {error && <ErrorNotice message={error} />}

      {slots && slots.length === 0 && !error && (
        <EmptyState title="No open slots" hint="Try a different date, or check the doctor ID is correct." />
      )}

      {slots && slots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink mb-3">Open slots for {date}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.start}
                onClick={() => handleBook(slot)}
                disabled={booking !== null}
                className="rounded border border-line bg-white px-3 py-2 text-sm font-mono text-ink hover:border-sage-500 hover:bg-sage-50 disabled:opacity-50 transition-colors"
              >
                {booking === slot.start ? 'Booking…' : formatDateTime(slot.start)}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
