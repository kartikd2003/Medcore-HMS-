'use client';

import { useEffect, useState } from 'react';
import { labApi } from '@/lib/lab-api';
import { ApiError } from '@/lib/api';
import type { LabTest } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';

export default function LabTestCatalogPage() {
  const [tests, setTests] = useState<LabTest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    labApi
      .listTests()
      .then(setTests)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the test catalog.'));
  }, []);

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader title="Test catalog" description="Every lab test the hospital offers, read-only." />

      {error && <ErrorNotice message={error} />}
      {tests === null && !error && <LoadingBlock />}
      {tests && tests.length === 0 && <EmptyState title="No lab tests configured" />}

      {tests && tests.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Test</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Turnaround</th>
                <th className="px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 text-ink font-medium">{test.name}</td>
                  <td className="px-4 py-3 font-mono text-ink-soft">{test.code ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {test.turnaroundHrs ? `${test.turnaroundHrs}h` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-soft">{formatMoney(test.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
