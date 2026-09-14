import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  getMenuForDate,
  createMenuSchedule,
  updateMenuSchedule,
  saveMenuMeals,
  removeMealFromMenu,
  copyMenu,
  getAllMeals,
  getOperationalMenuStatus,
} from '@/src/services/menu';
import { useCurrentStallId } from '@/src/contexts/StallContext';

export const useMenuForDate = (date: string) => {
  const stallId = useCurrentStallId();

  return useQuery({
    queryKey: ['menu', stallId, date],
    queryFn: () => getMenuForDate(stallId, date),
    enabled: !!stallId,
  });
};

export const useMealsPool = () => {
  return useQuery({
    queryKey: ['meals'],
    queryFn: () => getAllMeals(),
  });
};

export const useOperationalMenuStatus = (resolvedOperationalDate?: string, isResolving?: boolean) => {
  const stallId = useCurrentStallId();

  return useQuery({
    queryKey: ['menu', 'operational-status', stallId, resolvedOperationalDate],
    queryFn: () => getOperationalMenuStatus(stallId, resolvedOperationalDate!),
    enabled: !!stallId && !!resolvedOperationalDate && !isResolving,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

export const useSaveMenuMeals = (
  date: string,
  onSuccessCallback?: () => void,
  onErrorCallback?: (error: Error) => void
) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, mealIds, orderingStart, orderingEnd, deliveryStart, deliveryEnd }: { scheduleId: string | null; mealIds: string[]; orderingStart?: string; orderingEnd?: string; deliveryStart?: string; deliveryEnd?: string }) => {
      console.log('[useSaveMenuMeals] Starting save', { stallId, scheduleId, mealCount: mealIds.length });
      let activeScheduleId = scheduleId;
      if (!activeScheduleId) {
        console.log('[useSaveMenuMeals] Creating new schedule for stall:', stallId);
        const newSchedule = await createMenuSchedule(stallId, date, orderingStart, orderingEnd, deliveryStart, deliveryEnd);
        activeScheduleId = newSchedule.id;
        console.log('[useSaveMenuMeals] Schedule created:', activeScheduleId);
      }
      console.log('[useSaveMenuMeals] Saving meals to schedule:', activeScheduleId);
      await saveMenuMeals(activeScheduleId, mealIds);
      console.log('[useSaveMenuMeals] Meals saved successfully');
    },
    onSuccess: () => {
      console.log('[useSaveMenuMeals] Mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'operational-status', stallId] });
      onSuccessCallback?.();
    },
    onError: (error: Error) => {
      console.error('[useMenu] Save meals failed:', error);
      onErrorCallback?.(error);
    },
  });
};

export const useUpdateMenuSchedule = (
  date: string,
  onSuccessCallback?: () => void,
  onErrorCallback?: (error: Error) => void
) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, visibleFrom, orderCutoff, deliveryStartAt, deliveryEndAt }: { scheduleId: string; visibleFrom: string; orderCutoff: string; deliveryStartAt: string; deliveryEndAt: string }) => {
      console.log('[useUpdateMenuSchedule] Updating schedule:', scheduleId);
      return updateMenuSchedule(scheduleId, visibleFrom, orderCutoff, deliveryStartAt, deliveryEndAt);
    },
    onSuccess: () => {
      console.log('[useUpdateMenuSchedule] Schedule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'operational-status', stallId] });
      onSuccessCallback?.();
    },
    onError: (error: Error) => {
      console.error('[useMenu] Update schedule failed:', error);
      onErrorCallback?.(error);
    },
  });
};

export const useRemoveMealFromMenu = (
  date: string,
  onSuccessCallback?: () => void,
  onErrorCallback?: (error: Error) => void
) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, mealId }: { scheduleId: string; mealId: string }) =>
      removeMealFromMenu(scheduleId, mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'tomorrow-status', stallId] });
      onSuccessCallback?.();
    },
    onError: (error: Error) => {
      console.error('[useMenu] Remove meal failed:', error);
      onErrorCallback?.(error);
    },
  });
};

export const useCopyMenu = (
  targetDate: string,
  onSuccessCallback?: () => void,
  onErrorCallback?: (error: Error) => void
) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceDate: string) => copyMenu(stallId, sourceDate, targetDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, targetDate] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'tomorrow-status', stallId] });
      onSuccessCallback?.();
    },
    onError: (error: Error) => {
      console.error('[useMenu] Copy menu failed:', error);
      onErrorCallback?.(error);
    },
  });
};
