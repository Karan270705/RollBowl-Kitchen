import { supabase } from '@/src/lib/supabase';
import { AppConfig } from '@/src/constants/config';

// Helper to get today's date string in IST without toLocaleString
export function getTodayISTDateString(): string {
  const istDate = new Date(Date.now() + 19800000); // UTC+05:30 offset in ms (5.5 * 3600 * 1000)
  return istDate.toISOString().split('T')[0];
}

// Helper to get tomorrow's date string in IST without toLocaleString
export function getTomorrowISTDateString(baseDateStr?: string): string {
  if (baseDateStr) {
    const [year, month, day] = baseDateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day + 1));
    return d.toISOString().split('T')[0];
  }
  const tomorrowIst = new Date(Date.now() + 19800000 + 86400000);
  return tomorrowIst.toISOString().split('T')[0];
}

// Helper to get current Date object in standard epoch milliseconds
export function getCurrentISTTime(): Date {
  return new Date(); // Standard epoch time for reliable timestamp comparisons
}

// Helper to construct a UTC Date object representing IST time without locale-string parsing
export function parseTimeToDateIST(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const timeParts = timeStr.split(':').map(Number);
  const hours = timeParts[0] || 0;
  const minutes = timeParts[1] || 0;
  const seconds = timeParts[2] || 0;
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - 19800000;
  return new Date(utcMs);
}

// Helper to get yesterday's date string in IST without toLocaleString
export function getYesterdayISTDateString(baseDateStr: string): string {
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return d.toISOString().split('T')[0];
}

/**
 * Authoritative Single Source of Truth for Menu Schedule Timestamps.
 * Derives `visibleFrom` from OPERATIONAL_ROLLOVER_TIME on the previous calendar day,
 * and `orderCutoff` from ORDER_CUTOFF_TIME on the target menu date.
 */
export function generateMenuScheduleTimestamps(menuDateStr: string): { visibleFrom: string; orderCutoff: string } {
  const previousDayStr = getYesterdayISTDateString(menuDateStr);
  const rolloverTimeStr = AppConfig.BUSINESS.OPERATIONAL_ROLLOVER_TIME || '15:00';
  const cutoffTimeStr = AppConfig.BUSINESS.ORDER_CUTOFF_TIME || '10:00';

  const visibleFromDate = parseTimeToDateIST(previousDayStr, rolloverTimeStr);
  const orderCutoffDate = parseTimeToDateIST(menuDateStr, cutoffTimeStr);

  return {
    visibleFrom: visibleFromDate.toISOString(),
    orderCutoff: orderCutoffDate.toISOString(),
  };
}

export interface OperationalContextResult {
  calendarDate: string;
  resolvedOperationalDate: string | null;
  preparationDate: string;
  activeMenuDeliveryEndMs?: number;
  reason: string;
  resolutionReason: string;
  isResolving: boolean;
  stallId?: string;
}

export const DEFAULT_RESOLVING_CONTEXT: OperationalContextResult = {
  calendarDate: getTodayISTDateString(),
  resolvedOperationalDate: getTodayISTDateString(),
  preparationDate: getTomorrowISTDateString(),
  reason: 'Resolving',
  resolutionReason: 'Resolving',
  isResolving: true,
};

export async function resolveSharedOperationalDate(stallId?: string): Promise<OperationalContextResult> {
  const calendarDate = getTodayISTDateString();
  const currentIST = getCurrentISTTime();
  const nowMs = Date.now();
  const tomorrowStr = getTomorrowISTDateString(calendarDate);

  const logAndReturn = (
    resolvedDate: string | null,
    prepDate: string,
    reasonText: string,
    deliveryEndMs?: number
  ): OperationalContextResult => {
    const result: OperationalContextResult = {
      calendarDate,
      resolvedOperationalDate: resolvedDate,
      preparationDate: prepDate,
      activeMenuDeliveryEndMs: deliveryEndMs,
      reason: reasonText,
      resolutionReason: reasonText,
      isResolving: false,
      stallId,
    };

    console.log('[INSTRUMENTATION: resolveSharedOperationalDate - RESULT]', JSON.stringify({
      nowIST: new Date(nowMs).toISOString(),
      calendarDate,
      resolvedOperationsDate: resolvedDate,
      preparationDate: prepDate,
      resolutionReason: reasonText,
    }, null, 2));

    return result;
  };

  if (!stallId) {
    return logAndReturn(calendarDate, tomorrowStr, 'No stallId provided');
  }

  // Fetch upcoming menus starting from today to determine which is active based on explicit delivery end time
  const { data: upcomingMenus, error: upcomingMenusError } = await supabase
    .from('menu_schedules')
    .select('id, menu_date, delivery_end_at')
    .eq('stall_id', stallId)
    .eq('is_published', true)
    .gte('menu_date', calendarDate)
    .order('menu_date', { ascending: true })
    .limit(3);

  console.log('[INSTRUMENTATION: resolveSharedOperationalDate - SUPABASE RESULT]', JSON.stringify({
    calendarDate,
    tomorrowStr,
    upcomingMenus: upcomingMenus || [],
    error: upcomingMenusError || null,
  }, null, 2));

  let activeDate: string | null = null;
  let activeDeliveryEndMs: number | undefined;
  let firstUpcomingDate: string | null = null;

  if (upcomingMenus && upcomingMenus.length > 0) {
    firstUpcomingDate = upcomingMenus[0].menu_date;
    
    // The active menu is the first one where the delivery window hasn't fully expired
    for (const menu of upcomingMenus) {
      if (menu.delivery_end_at) {
        const endMs = new Date(menu.delivery_end_at).getTime();
        if (nowMs <= endMs) {
          activeDate = menu.menu_date;
          activeDeliveryEndMs = endMs;
          break;
        }
      }
    }
  }

  const preparationDate = activeDate || firstUpcomingDate || tomorrowStr;

  if (activeDate) {
    return logAndReturn(activeDate, preparationDate, 'Found active menu based on explicit delivery_end_at', activeDeliveryEndMs);
  }

  return logAndReturn(null, preparationDate, 'All fetched menus have expired and no future menus found');
}
