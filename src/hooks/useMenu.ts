import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMenuForDate,
  createMenuSchedule,
  saveMenuMeals,
  removeMealFromMenu,
  copyMenu,
  getAllMeals,
  getOperationalMenuStatus,
} from '@/src/services/menu';

export const useMenuForDate = (date: string) => {
  return useQuery({
    queryKey: ['menu', date],
    queryFn: () => getMenuForDate(date),
  });
};

export const useMealsPool = () => {
  return useQuery({
    queryKey: ['meals'],
    queryFn: () => getAllMeals(),
  });
};

export const useOperationalMenuStatus = () => {
  return useQuery({
    queryKey: ['menu', 'operational-status'],
    queryFn: getOperationalMenuStatus,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

export const useSaveMenuMeals = (date: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, mealIds }: { scheduleId: string | null; mealIds: string[] }) => {
      let activeScheduleId = scheduleId;
      if (!activeScheduleId) {
        const newSchedule = await createMenuSchedule(date);
        activeScheduleId = newSchedule.id;
      }
      await saveMenuMeals(activeScheduleId, mealIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'operational-status'] });
    },
  });
};

export const useRemoveMealFromMenu = (date: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, mealId }: { scheduleId: string; mealId: string }) =>
      removeMealFromMenu(scheduleId, mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', date] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'tomorrow-status'] });
    },
  });
};

export const useCopyMenu = (targetDate: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceDate: string) => copyMenu(sourceDate, targetDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'tomorrow-status'] });
    },
  });
};
