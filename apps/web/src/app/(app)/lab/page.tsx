'use client';

import { useEffect, useMemo, useState } from 'react';
import { labApi, type LabOrderQueueItem } from '@/lib/lab-api';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingBlock, ErrorNotice } from '@/components/PortalUI';
import { StatusBadge } from '@/components/StatusBadge';

const FILTERS: { label: string; value: 'ACTIVE' | 'ALL' }[] = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'All', value: 'ALL' },
];

function ResultUploadForm({
  order,
  onSubmit,
  onCancel,
  busy,
}: {
  order: LabOrderQueueItem;
  onSubmit: (input: { resultData?: unknown; resultFileUrl?: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  return (
    <div className="border-t border-line pt-3 mt-3 space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Result notes / values"
        rows={2}
        className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
      />
      <input
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="Result file URL (optional)"
        className="w-full rounded border border-line px-3 py-2 text-sm focus:border-sage-500 outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            onSubmit({
              resultData: notes ? { notes } : undefined,
              resultFileUrl: fileUrl || undefined,
            })
          }
          disabled={busy || (!notes && !fileUrl)}
          className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
        >
          Submit result
        </button>
        <button onClick={onCancel} disabled={busy} className="text-sm text-ink-soft hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function LabQueuePage() {
  const [orders, setOrders] = useState<LabOrderQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  const load = async () => {
    try {
      setOrders(await labApi.listQueue());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the lab order queue.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setUploadingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that lab order.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => filter === 'ALL' || (o.status !== 'APPROVED' && o.status !== 'REJECTED'))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders, filter],
  );

  return (
    <main className="px-8 py-8 max-w-3xl">
      <PageHeader title="Lab queue" description="Orders from collection through result review." />

      <div className="flex items-center gap-4 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-sm ${
              filter === f.value ? 'text-sage-700 font-medium' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {orders === null && !error && <LoadingBlock />}

      {orders && visible.length === 0 && (
        <EmptyState title="Nothing here" hint="New lab orders from doctors will show up in this queue." />
      )}

      {visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((order) => {
            const patientName = order.medicalRecord?.patient?.user
              ? `${order.medicalRecord.patient.user.firstName} ${order.medicalRecord.patient.user.lastName}`
              : 'Unknown patient';
            const busy = busyId === order.id;

            return (
              <Card key={order.id}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{order.labTest.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {patientName}
                      {order.labTest.code && ` · ${order.labTest.code}`}
                      {' · '}
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={order.status} />
                    {order.status === 'ORDERED' && (
                      <button
                        onClick={() => runAction(order.id, () => labApi.collectSample(order.id))}
                        disabled={busy}
                        className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
                      >
                        Collect sample
                      </button>
                    )}
                    {order.status === 'SAMPLE_COLLECTED' && uploadingId !== order.id && (
                      <button
                        onClick={() => setUploadingId(order.id)}
                        disabled={busy}
                        className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
                      >
                        Upload result
                      </button>
                    )}
                    {order.status === 'RESULT_UPLOADED' && (
                      <>
                        <button
                          onClick={() => runAction(order.id, () => labApi.approve(order.id))}
                          disabled={busy}
                          className="text-sm text-sage-600 hover:text-sage-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => runAction(order.id, () => labApi.reject(order.id))}
                          disabled={busy}
                          className="text-sm text-clay-500 hover:text-clay-600 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {order.resultFileUrl && (
                  <p className="text-xs text-ink-soft mt-2">
                    Result file:{' '}
                    <a
                      href={order.resultFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sage-600 hover:underline"
                    >
                      {order.resultFileUrl}
                    </a>
                  </p>
                )}

                {uploadingId === order.id && (
                  <ResultUploadForm
                    order={order}
                    busy={busy}
                    onCancel={() => setUploadingId(null)}
                    onSubmit={(input) => runAction(order.id, () => labApi.uploadResult(order.id, input))}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
