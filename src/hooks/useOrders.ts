import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, updateOrderStatus, updateOrderPaymentStatus } from '../services/orders';
import { Order } from '../types/models';
import { dashboardKeys, ordersKeys, invalidateCanonicalOperationalQueries } from '../constants/queryKeys';
import { normalizeError } from '../utils/errors';
import { Alert } from 'react-native';

export const useOrders = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  return useQuery({
    queryKey: stallId && operationsDate ? ordersKeys.list(stallId, operationsDate) : ['orders', 'skip'],
    queryFn: () => fetchOrders({ stallId, date: operationsDate || undefined, includeCancelled: false }),
    enabled: !!stallId && !!operationsDate,
  });
};

export const useUpdateOrderStatus = (stallId: string | undefined, operationsDate: string | undefined | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['status'] }) => 
      updateOrderStatus(orderId, status),
    onMutate: async () => {
      // No optimistic updates because we must wait for backend validation (e.g., cash guard)
      return {};
    },
    onError: (err) => {
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
    onMutate: async () => {
      return {};
    },
    onError: (err) => {
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
