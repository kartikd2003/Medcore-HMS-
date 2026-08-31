'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/superadmin-api';
import { ApiError } from '@/lib/api';
import type { Hospital, HospitalStatus } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';

function emptyForm() {
  return {
    name: '',
    slug: '',
    phone: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminTemporaryPassword: '',
  };
}

function StatusBadge({ status }: { status: HospitalStatus }) {
  const styles: Record<HospitalStatus, string> = {
    ACTIVE: 'bg-sage-50 text-sage-700',
    PENDING_VERIFICATION: 'bg-amber-50 text-amber-600',
    SUSPENDED: 'bg-clay-50 text-clay-600',
  };
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium font-mono tracking-tight ${styles[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setHospitals(await superAdminApi.listHospitals());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load hospitals.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.adminEmail || !form.adminFirstName || !form.adminLastName || !form.adminTemporaryPassword) {
      setError('A hospital needs a name, slug, and its first admin\u2019s details.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      // Onboarding a hospital and creating its first Hospital Admin
      // happen together, atomically — the backend won't create one
      // without the other.
      await superAdminApi.createHospital({
        name: form.name,
        slug: form.slug,
        phone: form.phone || undefined,
        adminEmail: form.adminEmail,
        adminFirstName: form.adminFirstName,
        adminLastName: form.adminLastName,
        adminTemporaryPassword: form.adminTemporaryPassword,
      });
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create that hospital.');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (hospital: Hospital) => {
    setBusyId(hospital.id);
    setError(null);
    try {
      await superAdminApi.activate(hospital.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not activate that hospital.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspend = async (hospital: Hospital) => {
    setBusyId(hospital.id);
    setError(null);
    try {
      await superAdminApi.suspend(hospital.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not suspend that hospital.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader title="Hospitals" description="Every tenant hospital on the platform." />

      <div className="mb-6">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm text-sage-600 hover:text-sage-700"
        >
          {showForm ? 'Cancel' : '+ Onboard a hospital'}
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <p className="text-xs text-ink-soft mb-3">
            A new hospital starts <span className="font-mono">PENDING_VERIFICATION</span> and needs
            its first admin created here, in the same step.
          </p>
          <div className="space-y-3 mb-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Hospital name"
              className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="Slug (e.g. lakeside-clinic)"
              className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone (optional)"
              className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <div className="border-t border-line pt-3 grid grid-cols-2 gap-3">
              <input
                value={form.adminFirstName}
                onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                placeholder="Admin first name"
                className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
              />
              <input
                value={form.adminLastName}
                onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                placeholder="Admin last name"
                className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
              />
              <input
                value={form.adminEmail}
                onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                placeholder="Admin email"
                type="email"
                className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
              />
              <input
                value={form.adminTemporaryPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminTemporaryPassword: e.target.value }))}
                placeholder="Admin temporary password"
                type="password"
                className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
          >
            Create hospital
          </button>
        </Card>
      )}

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {hospitals === null && !error && <LoadingBlock />}

      {hospitals && hospitals.length === 0 && <EmptyState title="No hospitals yet" />}

      {hospitals && hospitals.length > 0 && (
        <div className="space-y-3">
          {hospitals.map((hospital) => {
            const busy = busyId === hospital.id;
            return (
              <Card key={hospital.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{hospital.name}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {hospital.slug}
                    {hospital.phone && ` · ${hospital.phone}`}
                    {' · '}
                    Added {formatDate(hospital.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={hospital.status} />
                  {hospital.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleActivate(hospital)}
                      disabled={busy}
                      className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-40"
                    >
                      Activate
                    </button>
                  )}
                  {hospital.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => handleSuspend(hospital)}
                      disabled={busy}
                      className="text-sm text-clay-500 hover:text-clay-600 disabled:opacity-40"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
