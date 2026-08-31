'use client';

import { useEffect, useMemo, useState } from 'react';
import { pharmacyApi } from '@/lib/pharmacy-api';
import { ApiError } from '@/lib/api';
import type { Medicine } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';

function ReorderBadge({ low }: { low: boolean }) {
  if (!low) return null;
  return (
    <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium font-mono tracking-tight bg-amber-50 text-amber-600">
      REORDER
    </span>
  );
}

export default function PharmacyInventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Deltas, not new totals — the real endpoint (PATCH /medicines/:id/stock)
  // applies a signed adjustment atomically, so two pharmacists adjusting
  // stock at the same moment can't silently overwrite each other. A blank
  // draft means "no pending adjustment for this row".
  const [deltaDrafts, setDeltaDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);

  const load = async () => {
    try {
      setMedicines(await pharmacyApi.listMedicines());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the medicine inventory.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lowStockCount = useMemo(
    () => (medicines ?? []).filter((m) => m.stockQty <= m.reorderLevel).length,
    [medicines],
  );

  const visible = (medicines ?? []).filter((m) => !onlyLow || m.stockQty <= m.reorderLevel);

  const handleApply = async (id: string) => {
    const raw = deltaDrafts[id]?.trim();
    const delta = Number(raw);
    if (!raw || !Number.isFinite(delta) || !Number.isInteger(delta) || delta === 0) {
      setError('Enter a non-zero whole number — positive to receive stock, negative to correct downward.');
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      await pharmacyApi.adjustStock(id, delta);
      setDeltaDrafts((d) => ({ ...d, [id]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not adjust stock for that medicine.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="px-8 py-8 max-w-4xl">
      <PageHeader
        title="Inventory"
        description="Stock levels across the pharmacy, with reorder alerts."
      />

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink-soft mb-6">
        <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
        Show only medicines at or below reorder level
        {lowStockCount > 0 && ` (${lowStockCount})`}
      </label>

      {medicines === null && !error && <LoadingBlock />}

      {medicines && visible.length === 0 && (
        <EmptyState title="Nothing to show" hint="Try clearing the reorder filter." />
      )}

      {visible.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Medicine</th>
                <th className="px-4 py-3 font-medium">Unit price</th>
                <th className="px-4 py-3 font-medium">Reorder level</th>
                <th className="px-4 py-3 font-medium">Current stock</th>
                <th className="px-4 py-3 font-medium">Adjust (+/-)</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((med) => {
                const low = med.stockQty <= med.reorderLevel;
                return (
                  <tr key={med.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="text-ink font-medium">{med.name}</p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {med.genericName && `${med.genericName} · `}
                        {[med.form, med.strength].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-soft">{formatMoney(med.unitPrice)}</td>
                    <td className="px-4 py-3 font-mono text-ink-soft">{med.reorderLevel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-ink font-medium">{med.stockQty}</span>
                        <ReorderBadge low={low} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step={1}
                        placeholder="e.g. +50 or -3"
                        value={deltaDrafts[med.id] ?? ''}
                        onChange={(e) => setDeltaDrafts((d) => ({ ...d, [med.id]: e.target.value }))}
                        className="w-24 rounded border border-line px-2 py-1 font-mono text-sm focus:border-sage-500 outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleApply(med.id)}
                        disabled={savingId === med.id || !deltaDrafts[med.id]?.trim()}
                        className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-40"
                      >
                        Apply
                      </button>
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
