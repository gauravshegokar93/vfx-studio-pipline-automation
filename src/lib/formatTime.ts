/**
 * Standardized Date/Time formatting utilities for the application.
 * All formatting is pinned to Asia/Kolkata (IST) to ensure the 
 * studio times remain consistent regardless of the viewing browser's local timezone.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a Date object or ISO string into a 12-hour AM/PM string.
 * Example: "04:50 PM"
 */
export function formatTime12Hour(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'N/A';
  
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d).toUpperCase();
}

/**
 * Formats a Date object or ISO string into a local studio date string.
 * Example: "15/09/2026"
 */
export function formatDateLocal(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'N/A';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Formats a Date object or ISO string into a full date and time string.
 * Example: "15/09/2026, 04:50 PM"
 */
export function formatDateTimeLocal(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'N/A';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d).toUpperCase();
}
