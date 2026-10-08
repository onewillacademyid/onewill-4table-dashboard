/**
 * Date and Week Utilities for Onewill Academy
 * Timezone: Asia/Jakarta (WIB)
 */

export function getISOWeekNumber(date: Date): { week: number; year: number } {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { week: weekNumber, year: date.getFullYear() };
}

export function getWeekDates(weekNumber: number, year: number): { startDate: string; endDate: string; label: string } {
  // Simple calculation for ISO week Monday to Sunday
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dayOfWeek <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);

  const startFormatted = ISOweekStart.toISOString().split('T')[0];
  const endFormatted = ISOweekEnd.toISOString().split('T')[0];

  const startText = ISOweekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const endText = ISOweekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

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
