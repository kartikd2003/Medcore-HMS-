/**
 * One status vocabulary, reused everywhere a state appears
 * (appointments, lab orders, invoices). Sage = settled/good,
 * amber = awaiting action, clay = cancelled/blocked, gray = a
 * terminal state that isn't good or bad (e.g. a completed visit).
 * Mapping every known status value up front means a new page never
 * has to invent its own color logic.
 */
const STATUS_STYLES: Record<string, string> = {
  // Appointments
  PENDING: 'bg-amber-50 text-amber-600',
  CONFIRMED: 'bg-sage-50 text-sage-700',
  IN_PROGRESS: 'bg-sage-50 text-sage-700',
  COMPLETED: 'bg-line text-ink-soft',
  CANCELLED: 'bg-clay-50 text-clay-600',
  NO_SHOW: 'bg-clay-50 text-clay-600',
  // Lab orders
  ORDERED: 'bg-amber-50 text-amber-600',
  SAMPLE_COLLECTED: 'bg-amber-50 text-amber-600',
  RESULT_UPLOADED: 'bg-sage-50 text-sage-700',
  APPROVED: 'bg-sage-50 text-sage-700',
  REJECTED: 'bg-clay-50 text-clay-600',
  // Invoices
  DRAFT: 'bg-line text-ink-soft',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-600',
  PAID: 'bg-sage-50 text-sage-700',
  REFUNDED: 'bg-line text-ink-soft',
  VOID: 'bg-clay-50 text-clay-600',
  // Dispense state (derived client-side, not a real backend enum)
  DISPENSED: 'bg-sage-50 text-sage-700',
  NOT_DISPENSED: 'bg-amber-50 text-amber-600',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-line text-ink-soft';
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium font-mono tracking-tight ${style}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
