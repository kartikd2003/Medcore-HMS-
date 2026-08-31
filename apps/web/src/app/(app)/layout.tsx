'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { PulseLine } from '@/components/PulseLine';

/**
 * Every route under (app) — dashboard, and every future role portal
 * — is authenticated by this one layout instead of each page
 * repeating its own useEffect check. Still client-side (see the
 * README's "known gaps" note on middleware), but centralizing it
 * here is a real improvement: one place to get right, not nine.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sage-500 w-16">
          <PulseLine animate />
        </div>
      </main>
    );
  }

  return <AppShell>{children}</AppShell>;
}
