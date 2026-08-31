'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doctorApi, type PrescriptionItemInput } from '@/lib/doctor-api';
import { ApiError } from '@/lib/api';
import type { Appointment, Medicine, LabTest } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, LoadingBlock, ErrorNotice } from '@/components/PortalUI';

function emptyItem(): PrescriptionItemInput {
  return { medicineId: '', dosage: '', frequency: '', durationDays: 5, instructions: '' };
}

export default function ConsultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Vitals + notes
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseBpm, setPulseBpm] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');

  // Prescription + labs
  const [items, setItems] = useState<PrescriptionItemInput[]>([]);
  const [selectedLabTests, setSelectedLabTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        // No GET /appointments/:id on the backend — the queue list is
        // the only source of appointment details, so we refetch it
        // and find this one rather than inventing an endpoint that
        // doesn't exist.
        const [appointments, meds, tests] = await Promise.all([
          doctorApi.listAppointments(),
          doctorApi.listMedicines(),
          doctorApi.listLabTests(),
        ]);
        const found = appointments.find((a) => a.id === id) ?? null;
        if (!found) {
          setError('This appointment could not be found in your queue.');
        } else if (found.status !== 'IN_PROGRESS') {
          setError(`This appointment is ${found.status}, not in progress — it can't be completed from here.`);
        }
        setAppointment(found);
        setMedicines(meds);
        setLabTests(tests);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load consult data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, patch: Partial<PrescriptionItemInput>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const toggleLabTest = (labTestId: string) => {
    setSelectedLabTests((prev) => {
      const next = new Set(prev);
      if (next.has(labTestId)) next.delete(labTestId);
      else next.add(labTestId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    setError(null);

    const validItems = items.filter((i) => i.medicineId && i.dosage && i.frequency);
    if (items.some((i) => (i.medicineId || i.dosage || i.frequency) && !(i.medicineId && i.dosage && i.frequency))) {
      setError('Each prescription row needs a medicine, dosage, and frequency — or remove it.');
      return;
    }

    setSubmitting(true);
    try {
      await doctorApi.createMedicalRecord({
        appointmentId: appointment.id,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        bloodPressure: bloodPressure || undefined,
        pulseBpm: pulseBpm ? Number(pulseBpm) : undefined,
        temperatureC: temperatureC ? Number(temperatureC) : undefined,
        diagnosis: diagnosis || undefined,
        treatmentPlan: treatmentPlan || undefined,
        notes: notes || undefined,
        prescriptionItems: validItems.length > 0 ? validItems : undefined,
        labTestIds: selectedLabTests.size > 0 ? Array.from(selectedLabTests) : undefined,
      });
      router.push('/doctor');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this consult.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="px-8 py-8">
        <LoadingBlock />
      </main>
    );
  }

  const canSubmit = appointment && appointment.status === 'IN_PROGRESS';

  return (
    <main className="px-8 py-8 max-w-2xl">
      <button onClick={() => router.push('/doctor')} className="text-sm text-sage-600 hover:text-sage-700 mb-4">
        ← Queue
      </button>

      {error && !canSubmit && <ErrorNotice message={error} />}

      {appointment && (
        <>
          <PageHeader
            title={`${appointment.patient?.user?.firstName ?? ''} ${appointment.patient?.user?.lastName ?? ''}`}
            description={formatDateTime(appointment.scheduledAt)}
          />

          {canSubmit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Card>
                <p className="text-sm font-medium text-ink mb-3">Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <input placeholder="Height (cm)" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} type="number" className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                  <input placeholder="Weight (kg)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} type="number" className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                  <input placeholder="Blood pressure" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                  <input placeholder="Pulse (bpm)" value={pulseBpm} onChange={(e) => setPulseBpm(e.target.value)} type="number" className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                  <input placeholder="Temperature (°C)" value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} type="number" step="0.1" className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                </div>
              </Card>

              <Card className="space-y-3">
                <p className="text-sm font-medium text-ink">Diagnosis &amp; plan</p>
                <input placeholder="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                <textarea placeholder="Treatment plan" value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} rows={2} className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
                <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none" />
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ink">Prescription</p>
                  <button type="button" onClick={addItem} className="text-sm text-sage-600 hover:text-sage-700">
                    + Add medicine
                  </button>
                </div>
                {items.length === 0 && <p className="text-sm text-ink-soft">No medicines added.</p>}
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 border-b border-line last:border-0 pb-3 last:pb-0">
                      <select
                        value={item.medicineId}
                        onChange={(e) => updateItem(index, { medicineId: e.target.value })}
                        className="col-span-2 rounded border border-line px-2 py-1.5 text-sm focus:border-sage-500 outline-none"
                      >
                        <option value="">Select medicine…</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.strength} — {m.stockQty} in stock
                          </option>
                        ))}
                      </select>
                      <input placeholder="Dosage (e.g. 500mg)" value={item.dosage} onChange={(e) => updateItem(index, { dosage: e.target.value })} className="rounded border border-line px-2 py-1.5 text-sm focus:border-sage-500 outline-none" />
                      <input placeholder="Frequency (e.g. 1-0-1)" value={item.frequency} onChange={(e) => updateItem(index, { frequency: e.target.value })} className="rounded border border-line px-2 py-1.5 text-sm focus:border-sage-500 outline-none" />
                      <input placeholder="Duration (days)" type="number" min={1} value={item.durationDays} onChange={(e) => updateItem(index, { durationDays: Number(e.target.value) })} className="rounded border border-line px-2 py-1.5 text-sm focus:border-sage-500 outline-none" />
                      <input placeholder="Instructions (optional)" value={item.instructions} onChange={(e) => updateItem(index, { instructions: e.target.value })} className="rounded border border-line px-2 py-1.5 text-sm focus:border-sage-500 outline-none" />
                      <button type="button" onClick={() => removeItem(index)} className="col-span-2 text-left text-xs text-clay-500 hover:text-clay-600">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <p className="text-sm font-medium text-ink mb-3">Lab orders</p>
                {labTests.length === 0 && <p className="text-sm text-ink-soft">No lab tests in the catalog.</p>}
                <div className="grid grid-cols-2 gap-2">
                  {labTests.map((test) => (
                    <label key={test.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLabTests.has(test.id)}
                        onChange={() => toggleLabTest(test.id)}
                        className="accent-sage-500"
                      />
                      {test.name}
                    </label>
                  ))}
                </div>
              </Card>

              {error && <ErrorNotice message={error} />}

              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving…' : 'Complete consult'}
              </button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
