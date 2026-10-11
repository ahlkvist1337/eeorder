import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date for display. Returns '-' instead of throwing
 * when the value is missing or not a parseable date.
 */
export function safeFormatDate(value: string | Date | null | undefined, pattern: string): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '-';
  return format(date, pattern, { locale: sv });
}

/** Årtal måste ha fyra siffror och ligga inom rimligt intervall. */
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2099;

/**
 * Validates a date string for storage. Empty values are allowed;
 * non-empty values must parse and have a four-digit year within range.
 */
export function isValidPlannedDate(value: string | null | undefined): boolean {
  if (!value) return true;
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= MIN_YEAR && year <= MAX_YEAR;
}
