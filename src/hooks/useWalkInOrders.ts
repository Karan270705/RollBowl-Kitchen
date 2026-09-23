import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createWalkInOrder,
  getWalkInOrders,
  getAvailableWalkInItems,
  getWalkInSalesSummary,
} from '@/src/services/walkIn';
import { dashboardKeys } from '@/src/constants/queryKeys';
import type { CreateWalkInOrderInput } from '@/src/types/walkIn';

// ─── Query keys ───────────────────────────────────────────────

const keys = {
  orders: (stallId: string, serviceDate: string) =>
    ['walkInOrders', stallId, serviceDate] as const,
  summary: (stallId: string, serviceDate: string) =>
    ['walkInSalesSummary', stallId, serviceDate] as const,
  availableItems: (stallId: string, serviceDate: string, batchId: string | null) =>
    ['availableWalkInItems', stallId, serviceDate, batchId] as const,
} as const;

// ─── Query hooks ─────────────────────────────────────────────

/**
 * Fetch walk-in orders for a stall on a given service date.
 * Sorted newest-first (matches the service layer).
 */
export function useWalkInOrders(stallId: string, serviceDate: string) {
  return useQuery({
    queryKey: keys.orders(stallId, serviceDate),
    queryFn: () => getWalkInOrders(stallId, serviceDate),
    enabled: Boolean(stallId && serviceDate),
  });
}

/**
 * Fetch items available for walk-in sale.
 * Automatically switches between tracked (batchId set) and
 * untracked (batchId null) modes inside the service layer.
 */
export function useAvailableWalkInItems(
  stallId: string,
  serviceDate: string,
  batchId: string | null,
) {
  return useQuery({
    queryKey: keys.availableItems(stallId, serviceDate, batchId),
    queryFn: () => getAvailableWalkInItems(stallId, serviceDate, batchId),
    enabled: Boolean(stallId && serviceDate),
  });
}

/**
 * Get today's walk-in sales count and revenue for a stall.
 */
export function useWalkInSalesSummary(stallId: string, serviceDate: string) {
  return useQuery({
    queryKey: keys.summary(stallId, serviceDate),
    queryFn: () => getWalkInSalesSummary(stallId, serviceDate),
    enabled: Boolean(stallId && serviceDate),
  });
}

// ─── Mutation hook ───────────────────────────────────────────

/**
 * Mutation to create a walk-in order.
 *
 * On success, invalidates:
 * - Walk-in orders list (new entry to show)
 * - Walk-in sales summary (count + revenue changed)
 * - Live inventory status (stock was deducted)
 * - Available walk-in items (stock levels changed)
 */
export function useCreateWalkInOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWalkInOrderInput) => createWalkInOrder(input),
    onSuccess: (data, variables) => {
      const { stallId, serviceDate } = variables;

      // Walk-in order list + revenue summary
      queryClient.invalidateQueries({
        queryKey: keys.orders(stallId, serviceDate),
      });
      queryClient.invalidateQueries({
        queryKey: keys.summary(stallId, serviceDate),
      });

      // Inventory: stock was deducted
      queryClient.invalidateQueries({
        queryKey: ['live-inventory-status'],
      });

      // Available items: stock levels changed
      queryClient.invalidateQueries({
        queryKey: ['availableWalkInItems', stallId, serviceDate],
      });

      // Dashboard metrics: total orders count must refresh
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });

      if (__DEV__) {
        console.log('[WALK-IN ORDER CREATED]', {
          order_id: data.order_id,
          order_number: data.order_number,
          total: data.total,
        });
      }
    },
    onError: (error: Error) => {
      console.error('[WALK-IN ORDER ERROR]', error.message);
    },
  });
}

// ─── Re-export query keys for external use ────────────────────

export const walkInQueryKeys = keys;
