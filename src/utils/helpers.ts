/**
 * Date utilities for kitchen date-based workflows.
 * Kitchen operations revolve around specific dates (today's orders,
 * tomorrow's menu, etc.). These helpers provide consistent date handling.
 */

import { AppConfig } from '@/src/constants/config';

/**
 * Gets the current "kitchen date" — accounts for day rollover.
 * If it's before DAY_ROLLOVER_HOUR (e.g., 4 AM), we consider it
 * still part of the previous kitchen day.
 */
export function getKitchenDate(): Date {
  const now = new Date();
  if (now.getHours() < AppConfig.DAY_ROLLOVER_HOUR) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  return now;
}

/**
 * Gets tomorrow's date relative to the kitchen date.
 */
export function getKitchenTomorrow(): Date {
  const today = getKitchenDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Formats a date as YYYY-MM-DD for database queries.
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formats a date for display (e.g., "Sat, Jun 28").
 */
export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
