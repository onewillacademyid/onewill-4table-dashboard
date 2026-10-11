/**
 * Date and Week Utilities for Onewill Academy
 * Timezone: Asia/Jakarta (WIB)
 */

export function getISOWeekNumber(date: Date): { week: number; year: number } {
  // ISO 8601 week-year calculation using UTC:
  // Find Thursday of the current week (target):
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // Thursday of this week

  const isoYear = target.getUTCFullYear();

  // First Thursday of the ISO year is always in Week 1:
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3);

  // Number of weeks between first Thursday and target Thursday:
  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);

  return { week: weekNumber, year: isoYear };
}

export function getWeekDates(weekNumber: number, year: number): { startDate: string; endDate: string; label: string } {
  // ISO 8601 week calculation using UTC to avoid timezone drift:
  // Jan 4th is always guaranteed to be in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Monday = 1, Sunday = 7
  // Monday of week 1
  const monWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  // Monday of target weekNumber
  const monTarget = new Date(monWeek1.getTime() + (weekNumber - 1) * 7 * 86400000);
  // Sunday of target weekNumber
  const sunTarget = new Date(monTarget.getTime() + 6 * 86400000);

  const startFormatted = monTarget.toISOString().split('T')[0];
  const endFormatted = sunTarget.toISOString().split('T')[0];

  const startText = monTarget.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const endText = sunTarget.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return {
    startDate: startFormatted,
    endDate: endFormatted,
    label: `Pekan ${weekNumber} (${startText} – ${endText})`,
  };
}

export function formatDateIndonesian(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndonesian(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  } catch {
    return dateStr;
  }
}

export function formatRupiah(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
