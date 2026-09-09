import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHolidays, addHoliday, updateHolidayStatus, getHolidayForDate } from '../services/holidays';
import { KitchenHoliday } from '../types/models';
import { useCurrentStallId } from '../contexts/StallContext';

export const useHolidays = () => {
  const stallId = useCurrentStallId();

  return useQuery({
    queryKey: ['kitchen_holidays', stallId],
    queryFn: () => fetchHolidays(stallId),
    enabled: !!stallId,
  });
};

export const useHolidayForDate = (date: string) => {
  const stallId = useCurrentStallId();

  return useQuery({
    queryKey: ['kitchen_holidays', date, stallId],
    queryFn: () => getHolidayForDate(date, stallId),
    enabled: !!date && !!stallId,
  });
};

export const useAddHoliday = () => {
  const stallId = useCurrentStallId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { holidayDate: string; title: string; description?: string }) =>
      addHoliday({ ...params, stallId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen_holidays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tomorrow_reservations_detailed'] });
      queryClient.invalidateQueries({ queryKey: ['subscribers_list'] });
    },
  });
};

export const useUpdateHolidayStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateHolidayStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen_holidays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tomorrow_reservations_detailed'] });
      queryClient.invalidateQueries({ queryKey: ['subscribers_list'] });
    },
  });
};
