import { DAILY_TIMEZONE } from '../constants/index.js';

export function getTodayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getBRTWeekday(dateISO: string): number {
  return new Date(`${dateISO}T12:00:00-03:00`).getDay();
}

export function diffBRTDays(laterISO: string, earlierISO: string): number {
  const later = new Date(`${laterISO}T12:00:00-03:00`).getTime();
  const earlier = new Date(`${earlierISO}T12:00:00-03:00`).getTime();
  return Math.round((later - earlier) / (24 * 60 * 60 * 1000));
}

export function getBRTDateRange(): { start: string; end: string } {
  const today = getTodayBRT();
  return {
    start: `${today}T00:00:00-03:00`,
    end: `${today}T23:59:59-03:00`,
  };
}
