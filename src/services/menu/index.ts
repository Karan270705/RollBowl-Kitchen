import { supabase } from '@/src/lib/supabase';
import { MenuSchedule, MenuScheduleItem, Meal } from '@/src/types/models';
import { AppConfig } from '@/src/constants/config';
import { getKitchenDate, getKitchenTomorrow } from '@/src/utils/helpers';

// Helper to get the primary stall for the single-stall operation
export const getPrimaryStallId = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('stalls')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('No active stall found.');
  }
  return data.id;
};

// ─── Menu Schedules ──────────────────────────────────────────

export const getMenuForDate = async (date: string, stallId?: string): Promise<{ schedule: MenuSchedule | null, items: MenuScheduleItem[] }> => {
  const actualStallId = stallId || await getPrimaryStallId();

  // 1. Fetch the schedule
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('menu_schedules')
    .select('*')
    .eq('stall_id', actualStallId)
    .eq('menu_date', date)
    .maybeSingle();

  if (scheduleError) throw scheduleError;

  if (!scheduleData) {
    return { schedule: null, items: [] };
  }

  const schedule: MenuSchedule = {
    id: scheduleData.id,
    stallId: scheduleData.stall_id,
    menuDate: scheduleData.menu_date,
    visibleFrom: scheduleData.visible_from,
    orderCutoff: scheduleData.order_cutoff,
    isPublished: scheduleData.is_published,
    createdAt: scheduleData.created_at,
    updatedAt: scheduleData.updated_at,
  };

  // 2. Fetch the items with joined meal data
  const { data: itemsData, error: itemsError } = await supabase
    .from('menu_schedule_items')
    .select(`
      id,
      menu_schedule_id,
      meal_id,
      created_at,
      meals (*)
    `)
    .eq('menu_schedule_id', schedule.id);

  if (itemsError) throw itemsError;

  const items: MenuScheduleItem[] = (itemsData || []).map((item: any) => ({
    id: item.id,
    menuScheduleId: item.menu_schedule_id,
    mealId: item.meal_id,
    createdAt: item.created_at,
    meal: item.meals ? {
      id: item.meals.id,
      name: item.meals.name,
      description: item.meals.description,
      price: item.meals.price,
      originalPrice: item.meals.original_price,
      category: item.meals.category,
      type: item.meals.type,
      stallId: item.meals.stall_id,
      imageUrl: item.meals.image_url,
      isAvailable: item.meals.is_available,
      isFeatured: item.meals.is_featured,
      rating: item.meals.rating,
      totalRatings: item.meals.total_ratings,
      preparationTime: item.meals.preparation_time,
      tags: item.meals.tags || [],
    } : undefined,
  }));

  return { schedule, items };
};

export const createMenuSchedule = async (date: string, stallId?: string): Promise<MenuSchedule> => {
  const actualStallId = stallId || await getPrimaryStallId();
  
  // Default rules (6 PM publish previous day, 10 AM cutoff day of)
  const menuDateObj = new Date(date);
  
  // visible_from: Day before at 18:00
  const visibleFrom = new Date(menuDateObj);
  visibleFrom.setDate(visibleFrom.getDate() - 1);
  visibleFrom.setHours(18, 0, 0, 0);

  // order_cutoff: Target day at 10:00
  const orderCutoff = new Date(menuDateObj);
  orderCutoff.setHours(10, 0, 0, 0);

  const { data, error } = await supabase
    .from('menu_schedules')
    .insert({
      stall_id: actualStallId,
      menu_date: date,
      visible_from: visibleFrom.toISOString(),
      order_cutoff: orderCutoff.toISOString(),
      is_published: true,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    stallId: data.stall_id,
    menuDate: data.menu_date,
    visibleFrom: data.visible_from,
    orderCutoff: data.order_cutoff,
    isPublished: data.is_published,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

// ─── Menu Schedule Items ─────────────────────────────────────

export const saveMenuMeals = async (scheduleId: string, mealIds: string[]): Promise<void> => {
  if (mealIds.length === 0) return;
  
  const insertData = mealIds.map(mealId => ({
    menu_schedule_id: scheduleId,
    meal_id: mealId,
  }));

  const { error } = await supabase
    .from('menu_schedule_items')
    .upsert(insertData, { onConflict: 'menu_schedule_id, meal_id' });

  if (error) throw error;
};

export const removeMealFromMenu = async (scheduleId: string, mealId: string): Promise<void> => {
  const { error } = await supabase
    .from('menu_schedule_items')
    .delete()
    .match({ menu_schedule_id: scheduleId, meal_id: mealId });

  if (error) throw error;
};

// ─── Utilities ───────────────────────────────────────────────

export const getAllMeals = async (stallId?: string): Promise<Meal[]> => {
  const actualStallId = stallId || await getPrimaryStallId();
  
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('stall_id', actualStallId)
    .order('name');

  if (error) throw error;

  return (data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    price: m.price,
    originalPrice: m.original_price,
    category: m.category,
    type: m.type,
    stallId: m.stall_id,
    imageUrl: m.image_url,
    isAvailable: m.is_available,
    isFeatured: m.is_featured,
    rating: m.rating,
    totalRatings: m.total_ratings,
    preparationTime: m.preparation_time,
    tags: m.tags || [],
  }));
};

export const copyMenu = async (fromDate: string, toDate: string, stallId?: string): Promise<void> => {
  const actualStallId = stallId || await getPrimaryStallId();
  
  // 1. Get source menu
  const { schedule: sourceSchedule, items: sourceItems } = await getMenuForDate(fromDate, actualStallId);
  if (!sourceSchedule || sourceItems.length === 0) {
    throw new Error('No menu found for source date.');
  }

  // 2. Ensure target schedule exists
  let { schedule: targetSchedule } = await getMenuForDate(toDate, actualStallId);
  if (!targetSchedule) {
    targetSchedule = await createMenuSchedule(toDate, actualStallId);
  }

  // 3. Copy items
  const mealIds = sourceItems.map(item => item.mealId);
  await saveMenuMeals(targetSchedule.id, mealIds);
};

export const getOperationalMenuStatus = async (resolvedOperationalDate: string): Promise<{ isConfigured: boolean; itemCount: number }> => {
  try {
    const dateStr = resolvedOperationalDate;
    const { schedule, items } = await getMenuForDate(dateStr);
    
    return {
      isConfigured: !!schedule && items.length > 0,
      itemCount: items.length,
    };
  } catch (error) {
    return { isConfigured: false, itemCount: 0 };
  }
};
