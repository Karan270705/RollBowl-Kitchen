import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, updateOrderStatus, updateOrderPaymentStatus } from '../services/orders';
import { Order } from '../types/models';

export const ORDER_KEYS = {
  all: ['orders'] as const,
  list: (stallId?: string) => [...ORDER_KEYS.all, 'list', stallId] as const,
};

export const useOrders = (stallId?: string) => {
  return useQuery({
    queryKey: ORDER_KEYS.list(stallId),
    queryFn: () => fetchOrders({ stallId, includeFuture: true, includeCancelled: false }),
    refetchInterval: 15000, // Poll every 15 seconds for new orders
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['status'] }) => 
      updateOrderStatus(orderId, status),
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ORDER_KEYS.all });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueriesData<Order[]>({ queryKey: ORDER_KEYS.all });

      // Optimistically update
      queryClient.setQueriesData<Order[]>({ queryKey: ORDER_KEYS.all }, (oldData) => {
        if (!oldData) return [];
        return oldData.map(order => 
          order.id === orderId ? { ...order, status } : order
        );
      });

      return { previousOrders };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
    },
  });
};

export const useUpdateOrderPaymentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['paymentStatus'] }) => 
      updateOrderPaymentStatus(orderId, status),
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ORDER_KEYS.all });

      const previousOrders = queryClient.getQueriesData<Order[]>({ queryKey: ORDER_KEYS.all });

      queryClient.setQueriesData<Order[]>({ queryKey: ORDER_KEYS.all }, (oldData) => {
        if (!oldData) return [];
        return oldData.map(order => 
          order.id === orderId ? { ...order, paymentStatus: status } : order
        );
      });

      return { previousOrders };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
    },
  });
};
