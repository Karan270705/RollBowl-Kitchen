import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, updateOrderStatus, updateOrderPaymentStatus } from '../services/orders';
import { fetchWalkInSales } from '../services/inventory';
import { Order, HistoryEntry } from '../types/models';
import { dashboardKeys, ordersKeys, walkInKeys, invalidateCanonicalOperationalQueries } from '../constants/queryKeys';
import { normalizeError } from '../utils/errors';
import { Alert } from 'react-native';

export const useOrders = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  return useQuery({
    queryKey: stallId && operationsDate ? ordersKeys.list(stallId, operationsDate) : ['orders', 'skip'],
    queryFn: () => fetchOrders({ stallId, date: operationsDate || undefined, includeCancelled: false }),
    enabled: !!stallId && !!operationsDate,
  });
};

export const useWalkInSales = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  return useQuery({
    queryKey: stallId ? walkInKeys.list(stallId, operationsDate || 'all') : ['walk-in-sales', 'skip'],
    queryFn: () => fetchWalkInSales(stallId!, operationsDate),
    enabled: !!stallId,
  });
};

export const useOrderHistory = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  const ordersQuery = useOrders(stallId, operationsDate);
  const walkInQuery = useWalkInSales(stallId, operationsDate);

  // Screen stops loading once primary orders have loaded or failed. Supplemental walk-ins do not block forever.
  const isLoading = ordersQuery.isLoading;
  const isRefetching = ordersQuery.isRefetching || walkInQuery.isRefetching;
  const isError = ordersQuery.isError || walkInQuery.isError;

  const refetch = useCallback(async () => {
    await Promise.all([ordersQuery.refetch(), walkInQuery.refetch()]);
  }, [ordersQuery.refetch, walkInQuery.refetch]);

  // Merge into unified HistoryEntry[] sorted by createdAt descending (newest first)
  const history: HistoryEntry[] = useMemo(() => {
    const list: HistoryEntry[] = [];

    if (ordersQuery.data) {
      for (const order of ordersQuery.data) {
        list.push({ type: 'order', data: order });
      }
    }

    if (walkInQuery.data) {
      for (const walkIn of walkInQuery.data) {
        list.push({ type: 'walk_in', data: walkIn });
      }
    }

    // Sort newest first
    list.sort((a, b) => {
      const aTime = new Date(a.data.createdAt).getTime();
      const bTime = new Date(b.data.createdAt).getTime();
      return bTime - aTime;
    });

    return list;
  }, [ordersQuery.data, walkInQuery.data]);

  return {
    data: history,
    orders: ordersQuery.data || [],
    walkIns: walkInQuery.data || [],
    isLoading,
    isRefetching,
    isError,
    refetch,
  };
};

export const useUpdateOrderStatus = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['status'] }) => 
      updateOrderStatus(orderId, status),
    onMutate: async ({ orderId, status }) => {
      const queryKey = stallId ? ordersKeys.list(stallId, operationsDate || null) : ['orders', 'skip'];
      await queryClient.cancelQueries({ queryKey });

      const previousOrders = queryClient.getQueryData<Order[]>(queryKey);

      if (previousOrders) {
        queryClient.setQueryData<Order[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((order) =>
            order.id === orderId ? { ...order, status } : order
          );
        });
      }

      return { previousOrders, queryKey };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrders && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousOrders);
      }
      const message = normalizeError(err);
      Alert.alert('Action Failed', message);
    },
    onSuccess: () => {
      if (stallId) {
        invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate || null);
      }
    },
    onSettled: () => {
      if (stallId) {
        invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate || null);
      }
    },
  });
};

export const useUpdateOrderPaymentStatus = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['paymentStatus'] }) => 
      updateOrderPaymentStatus(orderId, status),
    onMutate: async ({ orderId, status }) => {
      const queryKey = stallId ? ordersKeys.list(stallId, operationsDate || null) : ['orders', 'skip'];
      await queryClient.cancelQueries({ queryKey });

      const previousOrders = queryClient.getQueryData<Order[]>(queryKey);

      if (previousOrders) {
        queryClient.setQueryData<Order[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((order) =>
            order.id === orderId ? { ...order, paymentStatus: status } : order
          );
        });
      }

      return { previousOrders, queryKey };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrders && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousOrders);
      }
      const message = normalizeError(err);
      Alert.alert('Action Failed', message);
    },
    onSuccess: () => {
      if (stallId) {
        invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate || null);
      }
    },
    onSettled: () => {
      if (stallId) {
        invalidateCanonicalOperationalQueries(queryClient, stallId, operationsDate || null);
      }
    },
  });
};
