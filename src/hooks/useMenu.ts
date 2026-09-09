import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const stallId = useCurrentStallId();

  return useQuery({
    queryKey: ['meals', stallId],
    queryFn: () => getAllMeals(stallId),
    enabled: !!stallId,
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

export const useSaveMenuMeals = (date: string) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, mealIds, orderingStart, orderingEnd, deliveryStart, deliveryEnd }: { scheduleId: string | null; mealIds: string[]; orderingStart?: string; orderingEnd?: string; deliveryStart?: string; deliveryEnd?: string }) => {
      let activeScheduleId = scheduleId;
      if (!activeScheduleId) {
        const newSchedule = await createMenuSchedule(stallId, date, orderingStart, orderingEnd, deliveryStart, deliveryEnd);
        activeScheduleId = newSchedule.id;
      }
      await saveMenuMeals(activeScheduleId, mealIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'operational-status', stallId] });
    },
  });
};

export const useUpdateMenuSchedule = (date: string) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, visibleFrom, orderCutoff, deliveryStartAt, deliveryEndAt }: { scheduleId: string; visibleFrom: string; orderCutoff: string; deliveryStartAt: string; deliveryEndAt: string }) =>
      updateMenuSchedule(scheduleId, visibleFrom, orderCutoff, deliveryStartAt, deliveryEndAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'operational-status', stallId] });
    },
  });
};

export const useRemoveMealFromMenu = (date: string) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, mealId }: { scheduleId: string; mealId: string }) =>
      removeMealFromMenu(scheduleId, mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'tomorrow-status', stallId] });
    },
  });
};

export const useCopyMenu = (targetDate: string) => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceDate: string) => copyMenu(stallId, sourceDate, targetDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', stallId, targetDate] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'tomorrow-status', stallId] });
    },
  });
};
