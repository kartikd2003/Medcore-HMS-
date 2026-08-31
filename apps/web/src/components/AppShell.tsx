'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_NAV } from '@/lib/nav-config';
import { PulseLine } from './PulseLine';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null; // the (app) layout handles the redirect; this guards a render-order edge case

  const navItems = ROLE_NAV[user.role];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-line bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-sage-500 w-10 mb-2">
            <PulseLine />
          </div>
          <p className="font-semibold text-ink text-sm">MedCore HMS</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.length === 0 && (
            <p className="text-xs text-ink-soft px-2 py-1">No sections yet for this role.</p>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-sage-50 text-sage-700 font-medium'
                    : 'text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-line">
          <p className="text-sm text-ink font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-ink-soft font-mono mt-0.5">{user.role}</p>
          <button
            onClick={() => logout()}
            className="text-xs text-ink-soft hover:text-clay-500 transition-colors mt-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
