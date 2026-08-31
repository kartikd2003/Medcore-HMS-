'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Generic authenticated landing page. Currently the real destination
 * for NURSE (no role-specific portal exists yet — see role-routing.ts)
 * and a safe fallback for any role whose dedicated dashboard isn't
 * built yet.
 */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="px-8 py-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-ink mb-1">Welcome, {user?.firstName}</h1>
      <p className="text-sm text-ink-soft mb-6">
        A dedicated dashboard for your role isn&apos;t built yet.
      </p>
      <div className="rounded-lg border border-line bg-white p-6">
        <p className="text-sm text-ink-soft">
          This placeholder confirms your session, role, and navigation shell all work
          correctly — the actual portal content for {user?.role} comes next.
        </p>
      </div>
    </main>
  );
}
