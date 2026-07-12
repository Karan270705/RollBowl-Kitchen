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

  // 1. Check if a disabled holiday already exists for this date (handles re-adding after disable)
  const { data: existing, error: checkError } = await supabase
    .from('kitchen_holidays')
    .select('id, is_active')
    .eq('stall_id', actualStallId)
    .eq('holiday_date', params.holidayDate)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    if (existing.is_active) {
      throw new Error('A holiday already exists for this date.');
    }

    // Re-enable the disabled holiday with updated title/description
    const { error: updateError } = await supabase
      .from('kitchen_holidays')
      .update({
        title: params.title,
        description: params.description,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;
  } else {
    // Insert new holiday
    const { error: insertError } = await supabase
      .from('kitchen_holidays')
      .insert({
        stall_id: actualStallId,
        holiday_date: params.holidayDate,
        title: params.title,
        description: params.description,
      });

    if (insertError) throw insertError;
  }

  // 2. Extend Affected Subscriptions via Database RPC
  const { error: rpcError } = await supabase.rpc('recalculate_overlapping_subscriptions', {
    p_stall_id: actualStallId,
    p_holiday_date: params.holidayDate
  });
  if (rpcError) throw rpcError;
};


export const updateHolidayStatus = async (holidayId: string, isActive: boolean): Promise<void> => {
  // 1. Get the holiday to know its date
  const { data: holiday, error: getError } = await supabase
    .from('kitchen_holidays')
    .select('holiday_date, is_active, stall_id')
    .eq('id', holidayId)
    .single();

  if (getError) throw getError;
  
  if (holiday.is_active === isActive) return; // No change

  // Check if historical
  const todayStr = new Date().toISOString().split('T')[0];
  if (holiday.holiday_date < todayStr) {
    throw new Error('Historical holidays cannot be modified.');
  }

  // 2. Update Holiday
  const { error: updateError } = await supabase
    .from('kitchen_holidays')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', holidayId);

  if (updateError) throw updateError;

  // 3. Apply/Rollback Subscription Extensions via Database RPC
  const { error: rpcError } = await supabase.rpc('recalculate_overlapping_subscriptions', {
    p_stall_id: holiday.stall_id,
    p_holiday_date: holiday.holiday_date
  });
  
  if (rpcError) throw rpcError;
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
