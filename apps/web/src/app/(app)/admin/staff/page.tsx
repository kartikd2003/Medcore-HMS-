'use client';

import { useEffect, useState } from 'react';
import { adminApi, ASSIGNABLE_ROLES, type StaffMember, type CreateStaffInput } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import type { Role } from '@/lib/types';

function emptyForm(): CreateStaffInput {
  return {
    email: '',
    firstName: '',
    lastName: '',
    role: 'RECEPTIONIST',
    temporaryPassword: '',
  };
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium font-mono tracking-tight bg-line text-ink-soft">
      {role.replace(/_/g, ' ')}
    </span>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user?.hospitalId) return;
    try {
      setStaff(await adminApi.listStaff(user.hospitalId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load staff.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.hospitalId]);

  const handleCreate = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.temporaryPassword) {
      setError('Fill in every field to add a staff member.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await adminApi.createStaff(form);
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that staff member.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (member: StaffMember) => {
    setBusyId(member.id);
    setError(null);
    try {
      await adminApi.deactivate(member.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not deactivate that account.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="px-8 py-8 max-w-4xl">
      <PageHeader title="Staff" description="Everyone with a staff account at your hospital." />

      <div className="mb-6">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm text-sage-600 hover:text-sage-700"
        >
          {showForm ? 'Cancel' : '+ Add staff member'}
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="First name"
              className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="Last name"
              className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              type="email"
              className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <input
              value={form.temporaryPassword}
              onChange={(e) => setForm((f) => ({ ...f, temporaryPassword: e.target.value }))}
              placeholder="Temporary password"
              type="password"
              className="rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreateStaffInput['role'] }))}
              className="col-span-2 rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
          >
            Create account
          </button>
        </Card>
      )}

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {staff === null && !error && <LoadingBlock />}

      {staff && staff.length === 0 && <EmptyState title="No staff accounts yet" />}

      {staff && staff.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const busy = busyId === member.id;
                return (
                  <tr key={member.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="text-ink font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5">{member.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium font-mono tracking-tight ${
                          member.isActive ? 'bg-sage-50 text-sage-700' : 'bg-clay-50 text-clay-600'
                        }`}
                      >
                        {member.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.isActive ? (
                        <button
                          onClick={() => handleDeactivate(member)}
                          disabled={busy}
                          className="text-sm text-clay-500 hover:text-clay-600 disabled:opacity-40"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="text-xs text-ink-soft">No action available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
