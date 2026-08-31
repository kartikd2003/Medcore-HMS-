import { PulseLine } from './PulseLine';

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {description && <p className="text-sm text-ink-soft mt-1">{description}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-white p-5 ${className}`}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-sage-500 w-14">
        <PulseLine animate />
      </div>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-clay-400/40 bg-clay-50 p-4">
      <p className="text-sm text-clay-600">{message}</p>
    </div>
  );
}
