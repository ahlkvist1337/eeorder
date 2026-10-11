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
