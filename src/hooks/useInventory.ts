import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { 
  fetchInventoryBatches, 
  fetchInventoryBatch, 
  fetchInventoryBatchItems, 
  fetchLiveInventoryStatus,
  createDraftInventoryBatch,
  updateDraftBatch,
  addDraftBatchItem,
  updateDraftBatchItem,
  removeDraftBatchItem,
  activateInventoryBatch,
  closeInventoryBatch,
  cancelInventoryBatch,
  recordInventoryMovement,
  formatLocalDate
} from '@/src/services/inventory';
import { getPrimaryStallId } from '@/src/services/menu';

export const useInventoryBatches = (stallId: string | undefined, date: string) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<any>(null);

  const query = useQuery({
    queryKey: ['inventory-batches', stallId, date],
    queryFn: () => fetchInventoryBatches(date, stallId),
    enabled: !!stallId && !!date,
  });

  useEffect(() => {
    if (!stallId || !date) return;
    
    const channelName = `inventory-batches-${stallId}-${date}-${Date.now()}-${Math.random()}`;
    const channel = supabase.channel(channelName);
    
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_batches', filter: `stall_id=eq.${stallId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['inventory-batches', stallId, date] });
      }
    );
    
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `stall_id=eq.${stallId}` },
      () => {
        // Orders change could affect fulfilled quantities or reserved quantities. 
        // We debounce this to avoid thrashing on bulk updates.
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['inventory-batches', stallId, date] });
          // Also aggressively invalidate live inventory statuses as they depend on orders
          queryClient.invalidateQueries({ queryKey: ['live-inventory-status'] });
        }, 500);
      }
    );
    
    channel.subscribe((status) => {
      if (__DEV__) {
        console.log('[Inventory Batches Realtime]', channelName, status);
      }
    });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [stallId, date, queryClient]);

  return query;
};

export const useInventoryBatch = (batchId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['inventory-batch', batchId],
    queryFn: () => fetchInventoryBatch(batchId!),
    enabled: !!batchId && batchId !== 'create',
  });

  useEffect(() => {
    if (!batchId || batchId === 'create') return;
    
    const channelName = `inventory-batch-detail-${batchId}-${Date.now()}-${Math.random()}`;
    const channel = supabase.channel(channelName);
    
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_batches', filter: `id=eq.${batchId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['inventory-batch', batchId] });
      }
    );
    
    channel.subscribe((status) => {
      if (__DEV__) {
        console.log('[Inventory Batch Detail Realtime]', channelName, status);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [batchId, queryClient]);

  return query;
};

export const useInventoryBatchItems = (batchId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['inventory-batch-items', batchId],
    queryFn: () => fetchInventoryBatchItems(batchId!),
    enabled: !!batchId && batchId !== 'create',
  });

  useEffect(() => {
    if (!batchId || batchId === 'create') {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const invalidate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['inventory-batch-items', batchId],
        });

        queryClient.invalidateQueries({
          queryKey: ['live-inventory-status', batchId],
        });

        queryClient.invalidateQueries({
          queryKey: ['inventory-batch', batchId],
        });
      }, 250);
    };

    const channelName =
      `inventory-items-list-${batchId}-${Date.now()}-${Math.random()}`;

    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_batch_items',
        filter: `inventory_batch_id=eq.${batchId}`,
      },
      invalidate,
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_movements',
        filter: `inventory_batch_id=eq.${batchId}`,
      },
      invalidate,
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_batches',
        filter: `id=eq.${batchId}`,
      },
      invalidate,
    );

    channel.subscribe((status) => {
      if (__DEV__) {
        console.log(
          '[Inventory Realtime]',
          channelName,
          status,
        );
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      void supabase.removeChannel(channel);
    };
  }, [batchId, queryClient]);

  return query;
};

export const useLiveInventoryStatus = (batchId: string | undefined) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<any>(null);

  const query = useQuery({
    queryKey: ['live-inventory-status', batchId],
    queryFn: () => fetchLiveInventoryStatus(batchId!),
    enabled: !!batchId && batchId !== 'create',
  });

  useEffect(() => {
    if (!batchId || batchId === 'create') return;
    
    const scheduleInvalidation = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['live-inventory-status', batchId] });
        queryClient.invalidateQueries({ queryKey: ['inventory-batch', batchId] });
      }, 250);
    };

    const channelName = `inventory-live-${batchId}-${Date.now()}-${Math.random()}`;
    const channel = supabase.channel(channelName);
    
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_batch_items', filter: `inventory_batch_id=eq.${batchId}` },
      scheduleInvalidation
    );
    
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_movements', filter: `inventory_batch_id=eq.${batchId}` },
      scheduleInvalidation
    );
    
    channel.subscribe((status) => {
      if (__DEV__) {
        console.log('[Live Inventory Status Realtime]', channelName, status);
      }
    });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [batchId, queryClient]);

  return query;
};

// Mutations
export const useCreateDraftBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { date: string | Date, windowStart: string | Date, windowEnd: string | Date, items: { mealId: string, loadedQuantity: number }[], stallId?: string, notes?: string }) => {
      return createDraftInventoryBatch(vars.date, vars.windowStart, vars.windowEnd, vars.items, vars.stallId, vars.notes);
    },
    onSuccess: (batchId, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches', vars.stallId, formatLocalDate(vars.date)] });
    }
  });
};

export const useUpdateDraftBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { batchId: string, windowStart: string | Date, windowEnd: string | Date }) => 
      updateDraftBatch(vars.batchId, vars.windowStart, vars.windowEnd),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch', vars.batchId] });
    }
  });
};

export const useAddDraftItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { batchId: string, mealId: string, loadedQuantity: number }) => 
      addDraftBatchItem(vars.batchId, vars.mealId, vars.loadedQuantity),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch-items', vars.batchId] });
    }
  });
};

export const useUpdateDraftItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { itemId: string, loadedQuantity: number, batchId: string }) => 
      updateDraftBatchItem(vars.itemId, vars.loadedQuantity),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch-items', vars.batchId] });
    }
  });
};

export const useRemoveDraftItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { itemId: string, batchId: string }) => 
      removeDraftBatchItem(vars.itemId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch-items', vars.batchId] });
    }
  });
};

export const useActivateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => activateInventoryBatch(batchId),
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['live-inventory-status', batchId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    }
  });
};

export const useCloseBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { batchId: string, note?: string }) => closeInventoryBatch(vars.batchId, vars.note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch', vars.batchId] });
      queryClient.invalidateQueries({ queryKey: ['live-inventory-status', vars.batchId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    }
  });
};

export const useCancelBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { batchId: string, note: string }) => cancelInventoryBatch(vars.batchId, vars.note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batch', vars.batchId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    }
  });
};

export const useRecordMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { batchItemId: string, type: string, quantity: number, note?: string, batchId: string }) => 
      recordInventoryMovement(vars.batchItemId, vars.type, vars.quantity, vars.note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['live-inventory-status', vars.batchId] });
    }
  });
};
