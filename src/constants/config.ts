/**
 * RollBowl Kitchen — App Configuration
 */

export const AppConfig = {
  APP_NAME: 'RollBowl Kitchen',
  APP_VERSION: '1.0.0',
  APP_TAGLINE: 'Kitchen Operations Hub',

  // Query defaults (for future React Query usage)
  QUERY_STALE_TIME: 5 * 60 * 1000,
  QUERY_CACHE_TIME: 10 * 60 * 1000,

  // Date-based workflow: the kitchen operates on a daily schedule
  // This offset (in hours) defines when a "kitchen day" rolls over.
  // e.g., 4 means a new kitchen day starts at 4:00 AM.
  DAY_ROLLOVER_HOUR: 4,

  // Business Operations
  BUSINESS: {
    PICKUP_START_TIME: '12:00', // 24h format HH:mm
    PICKUP_END_TIME: '14:00',
    ORDER_CUTOFF_TIME: '10:00',
  },

  // Allowed roles for this app
  ALLOWED_ROLES: ['kitchen', 'stall_operator'] as const,
} as const;
