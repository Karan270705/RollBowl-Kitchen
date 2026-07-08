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
  const targetStr = formatDateKey(date);
  const todayStr = formatDateKey(getKitchenDate());
  const tomorrowStr = formatDateKey(getKitchenTomorrow());

  let suffix = '';
  if (targetStr === todayStr) {
    suffix = ' (Today)';
  } else if (targetStr === tomorrowStr) {
    suffix = ' (Tomorrow)';
  }

  const baseFormat = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return `${baseFormat}${suffix}`;
}

/**
 * Checks if a menu is locked for a given date.
 * Business Rule: Orders close at 10:00 AM.
 * - Past dates: always locked.
 * - Today: locked if current time >= 10:00 AM.
 * - Future dates: editable.
 */
export function isMenuLocked(dateStr: string): boolean {
  const today = getKitchenDate();
  const todayStr = formatDateKey(today);
  
  if (dateStr < todayStr) {
    return true; // Past dates are always locked
  }
  
  if (dateStr === todayStr) {
    // Today's menu is locked if it's 10 AM or later
    return new Date().getHours() >= 10;
  }
  
  return false; // Future dates are never locked
}

/**
 * Checks if a subscription is expiring soon (within 3 days).
 */
export function isExpiringSoon(endDateStr: string): boolean {
  if (!endDateStr) return false;
  
  const today = getKitchenDate();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= 3;
}

