'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { PulseLine } from '@/components/PulseLine';
import { roleHomePath } from '@/lib/role-routing';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(roleHomePath(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="text-sage-500 mb-6 w-16">
            <PulseLine animate={isSubmitting} />
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">MedCore HMS</h1>
          <p className="text-ink-soft text-sm mt-1">Sign in to your hospital account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-line bg-white px-3 py-2 text-ink placeholder:text-ink-soft/50 focus:border-sage-500 focus:outline-none transition-colors"
              placeholder="you@hospital.dev"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-line bg-white px-3 py-2 text-ink focus:border-sage-500 focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-clay-500 bg-clay-50 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-sage-500 text-white font-medium py-2.5 hover:bg-sage-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-ink-soft mt-6 text-center">
          New patient?{' '}
          <a href="/register" className="text-sage-500 hover:text-sage-600 font-medium">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
