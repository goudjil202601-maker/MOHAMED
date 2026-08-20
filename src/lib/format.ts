export function formatCurrency(amount: number, lang: 'ar' | 'fr' = 'ar'): string {
  const value = Number(amount || 0).toFixed(2);
  return lang === 'ar' ? `${value} دج` : `${value} DZD`;
}

export function formatTime(date: string | Date, lang: 'ar' | 'fr' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}
