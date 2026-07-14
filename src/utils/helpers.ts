/**
 * Date utilities for kitchen date-based workflows.
 * The Business Calendar acts as the single source of truth for the
 * operational timeline across the entire application.
 */

import { AppConfig } from '@/src/constants/config';

export interface OperationalContext {
  executionDate: Date;
  operationalDate: Date;
}

export function getOperationalContext(): OperationalContext {
  const executionDate = getKitchenDate();
  const currentHour = new Date().getHours();
  
  // 2 PM is the hard operational cutoff for the kitchen.
  const isAfterExecutionCutoff = currentHour >= 14;

  let operationalDate = executionDate;

  if (isAfterExecutionCutoff) {
    // After 2 PM: Today is operationally finished. The planning focus completely snaps to TOMORROW.
    operationalDate = getKitchenTomorrow();
  }

  return { executionDate, operationalDate };
}

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

/**
 * Safely format database TIME strings (like "12:00:00") or ISO timestamps into display strings (e.g. "12:00 PM").
 * Avoids new Date() parsing of raw TIME strings.
 */
export function formatTimeSlot(timeString: string | null | undefined): string {
  if (!timeString) return '';
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (!isNaN(hour) && !isNaN(minute)) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12; // 0 should be 12
      const minStr = minute < 10 ? '0' + minute : minute;
      return `${hour}:${minStr} ${ampm}`;
    }
  }
  
  // Fallback to normal Date parsing if it is a full timestamp
  const date = new Date(timeString);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return timeString;
}

/**
 * Client-side check to determine if an active batch is stale/expired (60-minute grace period).
 */
export function isBatchExpired(inventoryDate: string, windowEnd: string, graceMinutes = 60): boolean {
  const todayKey = formatDateKey(getKitchenDate());
  if (inventoryDate < todayKey) {
    return true; // Past dates are expired
  }
  if (inventoryDate === todayKey) {
    const [hours, minutes] = windowEnd.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const expirationDate = getKitchenDate();
      expirationDate.setHours(hours, minutes, 0, 0);
      expirationDate.setMinutes(expirationDate.getMinutes() + graceMinutes);
      return new Date() > expirationDate;
    }
  }
  return false; // Future batches or non-expired today batches
}

