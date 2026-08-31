export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatMoney(amount: string | number, currency = 'USD'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    // Unknown/invalid currency code from data — fall back rather than throw in the UI.
    return `${value.toFixed(2)} ${currency}`;
  }
}
