'use client';

import { useEffect, useState } from 'react';
import { doctorApi, type AvailabilitySlot } from '@/lib/doctor-api';
import { ApiError } from '@/lib/api';
import { PageHeader, Card, LoadingBlock, ErrorNotice } from '@/components/PortalUI';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayRow {
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotMins: number;
}

function emptyWeek(): DayRow[] {
  return WEEKDAYS.map(() => ({ enabled: false, startTime: '09:00', endTime: '17:00', slotMins: 15 }));
}

export default function DoctorAvailabilityPage() {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [week, setWeek] = useState<DayRow[]>(emptyWeek());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await doctorApi.getMyProfile();
        setDoctorId(profile.id);
        const existing = await doctorApi.getAvailability(profile.id);
        if (existing.length > 0) {
          const next = emptyWeek();
          for (const slot of existing) {
            next[slot.weekday] = {
              enabled: true,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotMins: slot.slotMins,
            };
          }
          setWeek(next);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load your current availability.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateDay = (index: number, patch: Partial<DayRow>) => {
    setSaved(false);
    setWeek((w) => w.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const slots: AvailabilitySlot[] = week
      .map((day, weekday) => ({ ...day, weekday }))
      .filter((day) => day.enabled)
      .map((day) => ({
        weekday: day.weekday,
        startTime: day.startTime,
        endTime: day.endTime,
        slotMins: day.slotMins,
      }));

    if (slots.length === 0) {
      setError('Turn on at least one day before saving.');
      return;
    }

    setSaving(true);
    try {
      await doctorApi.setAvailability(slots);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your availability.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="px-8 py-8">
        <LoadingBlock />
      </main>
    );
  }

  return (
    <main className="px-8 py-8 max-w-2xl">
      <PageHeader
        title="Weekly availability"
        description="Saving replaces your whole week — days left off are cleared, not just left alone."
      />

      {!doctorId && !error && (
        <ErrorNotice message="Your doctor profile couldn't be found." />
      )}

      {doctorId && (
        <form onSubmit={handleSave}>
          <Card className="mb-4">
            <div className="space-y-3">
              {WEEKDAYS.map((label, index) => {
                const day = week[index];
                return (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                    <label className="flex items-center gap-2 w-32 shrink-0">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(e) => updateDay(index, { enabled: e.target.checked })}
                        className="accent-sage-500"
                      />
                      <span className="text-sm text-ink">{label}</span>
                    </label>
                    <input
                      type="time"
                      value={day.startTime}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(index, { startTime: e.target.value })}
                      className="rounded border border-line px-2 py-1 text-sm font-mono disabled:opacity-40 focus:border-sage-500 outline-none"
                    />
                    <span className="text-ink-soft text-sm">to</span>
                    <input
                      type="time"
                      value={day.endTime}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(index, { endTime: e.target.value })}
                      className="rounded border border-line px-2 py-1 text-sm font-mono disabled:opacity-40 focus:border-sage-500 outline-none"
                    />
                    <span className="text-ink-soft text-sm">·</span>
                    <select
                      value={day.slotMins}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(index, { slotMins: Number(e.target.value) })}
                      className="rounded border border-line px-2 py-1 text-sm font-mono disabled:opacity-40 focus:border-sage-500 outline-none"
                    >
                      {[10, 15, 20, 30, 45, 60].map((mins) => (
                        <option key={mins} value={mins}>
                          {mins} min slots
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </Card>

          {error && (
            <div className="mb-4">
              <ErrorNotice message={error} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save availability'}
            </button>
            {saved && <span className="text-sm text-sage-600">Saved.</span>}
          </div>
        </form>
      )}
    </main>
  );
}
