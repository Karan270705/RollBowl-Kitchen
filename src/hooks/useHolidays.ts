import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHolidays, addHoliday, updateHolidayStatus, getHolidayForDate } from '../services/holidays';
import { KitchenHoliday } from '../types/models';

export const useHolidays = (stallId?: string) => {
  return useQuery({
    queryKey: ['kitchen_holidays', stallId],
    queryFn: () => fetchHolidays(stallId),
  });
};

export const useHolidayForDate = (date: string, stallId?: string) => {
  return useQuery({
    queryKey: ['kitchen_holidays', date, stallId],
    queryFn: () => getHolidayForDate(date, stallId),
    enabled: !!date,
  });
};

export const useAddHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { holidayDate: string; title: string; description?: string; stallId?: string }) => 
      addHoliday(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen_holidays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      queryClient.invalidateQueries({ queryKey: ['tomorrow_reservations_detailed'] });
      queryClient.invalidateQueries({ queryKey: ['subscribers_list'] });
    },
  });
};
