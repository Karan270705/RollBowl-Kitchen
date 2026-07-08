import { supabase } from '@/src/lib/supabase';
import { KitchenHoliday } from '@/src/types/models';
import { getPrimaryStallId } from '@/src/services/menu';

export const fetchHolidays = async (stallId?: string): Promise<KitchenHoliday[]> => {
  const actualStallId = stallId || await getPrimaryStallId();

  const { data, error } = await supabase
    .from('kitchen_holidays')
    .select('*')
    .eq('stall_id', actualStallId)
    .order('holiday_date', { ascending: false });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    stallId: row.stall_id,
    holidayDate: row.holiday_date,
    title: row.title,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }));
};

export const addHoliday = async (params: { holidayDate: string; title: string; description?: string; stallId?: string }): Promise<void> => {
  const actualStallId = params.stallId || await getPrimaryStallId();

  // 1. Insert Holiday
  const { error: insertError } = await supabase
    .from('kitchen_holidays')
    .insert({
      stall_id: actualStallId,
      holiday_date: params.holidayDate,
      title: params.title,
      description: params.description,
    });

  if (insertError) throw insertError;

  // 2. Extend Affected Subscriptions
  // Find all active subscriptions where end_date >= holidayDate
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, end_date, extended_days')
    .eq('status', 'active')
    .gte('end_date', params.holidayDate);

  if (subsError) throw subsError;

  if (subs && subs.length > 0) {
    // We update each one to add 1 day to end_date and increment extended_days
    for (const sub of subs) {
      const newEndDate = new Date(sub.end_date);
      newEndDate.setDate(newEndDate.getDate() + 1);

      await supabase
        .from('subscriptions')
        .update({
          end_date: newEndDate.toISOString().split('T')[0],
          extended_days: (sub.extended_days || 0) + 1,
        })
        .eq('id', sub.id);
    }
  }
};

export const updateHolidayStatus = async (holidayId: string, isActive: boolean): Promise<void> => {
  // 1. Get the holiday to know its date
  const { data: holiday, error: getError } = await supabase
    .from('kitchen_holidays')
    .select('holiday_date, is_active')
    .eq('id', holidayId)
    .single();

  if (getError) throw getError;
  
  if (holiday.is_active === isActive) return; // No change

  // 2. Update Holiday
  const { error: updateError } = await supabase
    .from('kitchen_holidays')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', holidayId);

  if (updateError) throw updateError;

  // 3. Apply/Rollback Subscription Extensions
  const modifier = isActive ? 1 : -1;

  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, end_date, extended_days')
    .eq('status', 'active')
    .gte('end_date', holiday.holiday_date);

  if (subsError) throw subsError;

  if (subs && subs.length > 0) {
    for (const sub of subs) {
      const newEndDate = new Date(sub.end_date);
      newEndDate.setDate(newEndDate.getDate() + modifier);

      // Ensure we don't drop below 0 for extended_days
      const newExtendedDays = Math.max(0, (sub.extended_days || 0) + modifier);

      await supabase
        .from('subscriptions')
        .update({
          end_date: newEndDate.toISOString().split('T')[0],
          extended_days: newExtendedDays,
        })
        .eq('id', sub.id);
    }
  }
};

export const getHolidayForDate = async (date: string, stallId?: string): Promise<KitchenHoliday | null> => {
  const actualStallId = stallId || await getPrimaryStallId();

  const { data, error } = await supabase
    .from('kitchen_holidays')
    .select('*')
    .eq('stall_id', actualStallId)
    .eq('holiday_date', date)
    .eq('is_active', true)
    .limit(1);

  if (error) throw error;
  
  if (!data || data.length === 0) return null;
  
  const holiday = data[0];

  return {
    id: holiday.id,
    stallId: holiday.stall_id,
    holidayDate: holiday.holiday_date,
    title: holiday.title,
    description: holiday.description,
    isActive: holiday.is_active,
    createdAt: holiday.created_at,
    updatedAt: holiday.updated_at,
    createdBy: holiday.created_by,
  };
};
