import { supabase } from '@/src/lib/supabase';
import { getPrimaryStallId } from '@/src/services/menu';

export interface InventoryBatch {
  id: string;
  stall_id: string;
  inventory_date: string;
  window_start: string;
  window_end: string;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  created_by: string;
  notes?: string;
  activated_at?: string;
  closed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatchItem {
  id: string;
  inventory_batch_id: string;
  meal_id: string;
  loaded_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface LiveInventoryStatus {
  inventory_batch_item_id: string;
  batch_id: string;
  meal_id: string;
  item_name: string;
  stall_id: string;
  inventory_date: string;
  window_start: string;
  window_end: string;
  batch_status: string;
  loaded_quantity: number;
  manual_inflow: number;
  manual_outflow: number;
  active_reserved: number;
  fulfilled: number;
  cancelled: number;
  effective_loaded: number;
  remaining_physical: number;
  extra_available: number;
  customer_available: number;
  stock_status: string;
}

export interface InventoryMovement {
  id: string;
  inventory_batch_id: string;
  inventory_batch_item_id: string;
  meal_id: string;
  movement_type: string;
  quantity: number;
  reference_order_id?: string;
  created_by: string;
  note?: string;
  created_at: string;
}

// Custom error mapping
export const parseInventoryError = (error: any): Error => {
  const msg = error?.message || '';
  const hint = error?.hint || '';
  const details = error?.details || '';
  const fullText = `${msg} ${hint} ${details}`.toUpperCase();

  if (fullText.includes('UNAUTHORIZED')) return new Error("You are not authorized to manage this stall's inventory.");
  if (fullText.includes('BATCH_NOT_FOUND')) return new Error("This inventory batch no longer exists.");
  if (fullText.includes('BATCH_NOT_ACTIVE')) return new Error("This batch must be active to record movements.");
  if (fullText.includes('INVALID_ITEMS')) return new Error("Some selected menu items are invalid or duplicated.");
  if (fullText.includes('INVALID_QUANTITY')) return new Error("Invalid quantity specified.");
  if (fullText.includes('INVALID_PAYLOAD')) return new Error("Invalid data submitted.");
  if (fullText.includes('ITEM_NOT_IN_BATCH')) return new Error("Item not found in this inventory batch.");
  if (fullText.includes('INSUFFICIENT_STOCK')) return new Error("Cannot perform this action: insufficient stock available.");
  if (fullText.includes('WINDOW_MISMATCH')) return new Error("Delivery window mismatch.");

  const message = error?.message || '';
  if (message.includes('NOT_PUBLISHED') || message.includes('menu')) {
    return new Error(message || 'Menu validation failed.');
  }
  if (message.includes('BATCH_NOT_DRAFT')) {
    return new Error('Only draft batches can be modified.');
  }
  if (message.includes('MEAL_NOT_IN_PUBLISHED_MENU')) {
    return new Error('Some meals are not in the published menu for this date.');
  }
  if (message.includes('MEAL_NOT_AVAILABLE')) {
    return new Error('Some meals are currently unavailable.');
  }
  if (message.includes('MEAL_STALL_MISMATCH')) {
    return new Error('Meal does not belong to this stall.');
  }
  if (message.includes('INVALID_BATCH_MENU_ITEMS')) {
    // Try to parse invalid items if provided in JSON structure
    try {
      const parsed = JSON.parse(message);
      if (parsed.items && Array.isArray(parsed.items)) {
        const names = parsed.items.map((i: any) => i.meal_name).join(', ');
        return new Error(`Activation failed. Invalid items: ${names}`);
      }
    } catch (e) {}
    return new Error('Some batch items are not valid for the published menu.');
  }

  return new Error(message || 'An inventory error occurred.');
};

export const fetchInventoryBatches = async (date: string, stallId?: string): Promise<InventoryBatch[]> => {
  const actualStallId = stallId || await getPrimaryStallId();
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('stall_id', actualStallId)
    .eq('inventory_date', date)
    .order('window_start', { ascending: true });

  if (error) throw parseInventoryError(error);
  return data || [];
};

export const fetchInventoryBatch = async (batchId: string): Promise<InventoryBatch> => {
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) throw parseInventoryError(error);
  return data;
};

export const fetchInventoryBatchItems = async (batchId: string): Promise<(InventoryBatchItem & { meals: { name: string, category: string } })[]> => {
  const { data, error } = await supabase
    .from('inventory_batch_items')
    .select('*, meals (name, category)')
    .eq('inventory_batch_id', batchId);

  if (error) throw parseInventoryError(error);
  return data || [];
};

export const fetchLiveInventoryStatus = async (batchId: string): Promise<LiveInventoryStatus[]> => {
  const { data, error } = await supabase
    .from('live_inventory_status')
    .select('*')
    .eq('batch_id', batchId);

  if (error) throw parseInventoryError(error);
  return data || [];
};

export function formatLocalTime(date: Date | string): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatLocalDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchPublishedMenuMeals(stallId: string, date: string): Promise<{ hasPublishedMenu: boolean, meals: any[] }> {
  // First, check if a published schedule exists for this date and stall
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('menu_schedules')
    .select('id')
    .eq('stall_id', stallId)
    .eq('menu_date', date)
    .eq('is_published', true)
    .limit(1);

  if (scheduleError) {
    console.error('[Inventory] Error checking published schedule:', scheduleError);
    return { hasPublishedMenu: false, meals: [] };
  }

  const hasPublishedMenu = scheduleData && scheduleData.length > 0;
  if (!hasPublishedMenu) {
    return { hasPublishedMenu: false, meals: [] };
  }

  // Fetch the meals that are in the published schedule
  const { data, error } = await supabase
    .from('menu_schedule_items')
    .select(`
      meal_id,
      meals!inner(
        id,
        name,
        category,
        price,
        is_available,
        stall_id
      ),
      menu_schedules!inner(
        stall_id,
        menu_date,
        is_published
      )
    `)
    .eq('menu_schedules.stall_id', stallId)
    .eq('menu_schedules.menu_date', date)
    .eq('menu_schedules.is_published', true)
    .eq('meals.is_available', true);

  if (error) {
    console.error('[Inventory] Error fetching published meals:', error);
    return { hasPublishedMenu: true, meals: [] };
  }

  if (!data) {
    return { hasPublishedMenu: true, meals: [] };
  }

  // Deduplicate by meal_id since multiple schedules on same date could exist (if not unique)
  const mealsMap = new Map<string, any>();
  for (const row of data) {
    const meal = row.meals as any;
    if (meal && !mealsMap.has(meal.id)) {
      mealsMap.set(meal.id, meal);
    }
  }

  // Sort them as requested previously
  const mealsList = Array.from(mealsMap.values()).sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  return { hasPublishedMenu: true, meals: mealsList };
}

export const createDraftInventoryBatch = async (
  date: string | Date,
  windowStart: string | Date,
  windowEnd: string | Date,
  items: { mealId: string; loadedQuantity: number }[],
  stallId?: string,
  notes?: string
): Promise<string> => {
  const actualStallId = stallId || await getPrimaryStallId();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !user.id) {
    throw new Error("You must be logged in to create a batch.");
  }

  const dDate = new Date(date);
  const dStart = new Date(windowStart);
  const dEnd = new Date(windowEnd);

  if (isNaN(dDate.getTime())) throw new Error("date must be valid");
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) throw new Error("start and end must exist");
  if (dEnd <= dStart) throw new Error("end time must be later than start time");
  if (!items || items.length === 0 || !items.some(i => i.loadedQuantity > 0)) {
    throw new Error("at least one meal must have loaded_quantity > 0");
  }

  const inventory_date = formatLocalDate(dDate);
  const window_start = formatLocalTime(dStart);
  const window_end = formatLocalTime(dEnd);

  console.log('[Inventory] Creating draft', {
    stallId: actualStallId,
    inventoryDate: inventory_date,
    windowStart: window_start,
    windowEnd: window_end,
    authenticatedUserId: user.id,
    selectedItemCount: items.length,
  });

  // 1. Create Batch
  const { data: batch, error: batchError } = await supabase
    .from('inventory_batches')
    .insert({
      stall_id: actualStallId,
      inventory_date,
      window_start,
      window_end,
      status: 'draft',
      created_by: user.id,
      notes: notes?.trim() || null
    })
    .select('id')
    .single();

  if (batchError) throw parseInventoryError(batchError);

  if (items.length > 0) {
    const itemsToInsert = items.map(i => ({
      inventory_batch_id: batch.id,
      meal_id: i.mealId,
      loaded_quantity: i.loadedQuantity
    }));

    const { error: itemsError } = await supabase
      .from('inventory_batch_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Compensating Cleanup
      const { error: cleanupError } = await supabase.from('inventory_batches').delete().eq('id', batch.id);
      if (cleanupError) {
        console.error('CRITICAL: Failed to clean up partial draft batch:', cleanupError);
      }
      throw parseInventoryError(itemsError);
    }
  }

  return batch.id;
};

export const updateDraftBatch = async (batchId: string, windowStart: string | Date, windowEnd: string | Date): Promise<void> => {
  const dStart = new Date(windowStart);
  const dEnd = new Date(windowEnd);
  
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) throw new Error("start and end must exist");
  if (dEnd <= dStart) throw new Error("end time must be later than start time");

  const window_start = formatLocalTime(dStart);
  const window_end = formatLocalTime(dEnd);

  const { error } = await supabase
    .from('inventory_batches')
    .update({ window_start, window_end })
    .eq('id', batchId)
    .eq('status', 'draft');

  if (error) throw parseInventoryError(error);
};

export const addDraftBatchItem = async (batchId: string, mealId: string, loadedQuantity: number): Promise<void> => {
  const { error } = await supabase
    .from('inventory_batch_items')
    .insert({
      inventory_batch_id: batchId,
      meal_id: mealId,
      loaded_quantity: loadedQuantity
    });

  if (error) throw parseInventoryError(error);
};

export const updateDraftBatchItem = async (itemId: string, loadedQuantity: number): Promise<void> => {
  const { error } = await supabase
    .from('inventory_batch_items')
    .update({ loaded_quantity: loadedQuantity })
    .eq('id', itemId);

  if (error) throw parseInventoryError(error);
};

export const removeDraftBatchItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('inventory_batch_items')
    .delete()
    .eq('id', itemId);

  if (error) throw parseInventoryError(error);
};

// RPC Calls
export const activateInventoryBatch = async (batchId: string): Promise<void> => {
  const { error } = await supabase.rpc('activate_inventory_batch', { p_batch_id: batchId });
  if (error) throw parseInventoryError(error);
};

export const closeInventoryBatch = async (batchId: string, note?: string): Promise<void> => {
  const { error } = await supabase.rpc('close_inventory_batch', { p_batch_id: batchId, p_note: note || null });
  if (error) throw parseInventoryError(error);
};

export const cancelInventoryBatch = async (batchId: string, note: string): Promise<void> => {
  const { error } = await supabase.rpc('cancel_inventory_batch', { p_batch_id: batchId, p_note: note });
  if (error) throw parseInventoryError(error);
};

export const recordInventoryMovement = async (
  batchItemId: string,
  movementType: string,
  quantity: number,
  note?: string,
  referenceOrderId?: string
): Promise<void> => {
  const { error } = await supabase.rpc('record_inventory_movement', {
    p_batch_item_id: batchItemId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_note: note || null,
    p_reference_order_id: referenceOrderId || null
  });
  if (error) throw parseInventoryError(error);
};
