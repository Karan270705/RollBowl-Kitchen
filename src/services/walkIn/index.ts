import { supabase } from '@/src/lib/supabase';
import type {
  CreateWalkInOrderInput,
  CreateWalkInOrderResponse,
  WalkInOrder,
  AvailableWalkInItem,
} from '@/src/types/walkIn';

// ─── Create ──────────────────────────────────────────────────

/**
 * Create a walk-in order and atomically deduct inventory.
 * Delegates to the `place_walk_in_order` RPC so all business rules
 * (access check, stock validation, order numbering) live in the DB.
 */
export async function createWalkInOrder(
  input: CreateWalkInOrderInput,
): Promise<CreateWalkInOrderResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('place_walk_in_order', {
    p_stall_id: input.stallId,
    p_service_date: input.serviceDate,
    p_batch_id: input.batchId,
    p_items: input.items,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes ?? null,
    p_created_by: user.id,
  });

  if (error) {
    console.error('[CREATE WALK-IN ORDER ERROR]', error);

    // Surface human-readable messages from DB-level sentinel codes
    const msg = error.message ?? '';
    if (msg.includes('WALK_IN_ACCESS_DENIED')) {
      throw new Error('You do not have permission to create walk-in orders for this stall');
    }
    if (msg.includes('WALK_IN_INSUFFICIENT_STOCK')) {
      throw new Error('Insufficient inventory. Please check stock levels.');
    }
    if (msg.includes('WALK_IN_MEAL_NOT_FOUND')) {
      throw new Error('One or more items not found');
    }
    if (msg.includes('WALK_IN_EMPTY_ORDER')) {
      throw new Error('Order must contain at least one item');
    }

    throw new Error(msg || 'Failed to create walk-in order');
  }

  return data as CreateWalkInOrderResponse;
}

// ─── Fetch Orders ─────────────────────────────────────────────

/**
 * Fetch all walk-in orders for a stall on a specific service date,
 * sorted newest first.
 */
export async function getWalkInOrders(
  stallId: string,
  serviceDate: string,
): Promise<WalkInOrder[]> {
  const { data, error } = await supabase
    .from('walk_in_orders')
    .select('*')
    .eq('stall_id', stallId)
    .eq('service_date', serviceDate)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET WALK-IN ORDERS ERROR]', error);
    throw new Error('Failed to fetch walk-in orders');
  }

  return data as WalkInOrder[];
}

// ─── Available Items ──────────────────────────────────────────

/**
 * Return items available for walk-in sale.
 *
 * - **Untracked mode** (`batchId === null`): falls back to all active,
 *   non-combo meals; reports availability as 999 (unlimited).
 * - **Tracked mode**: queries `live_inventory_status` view, showing only
 *   items with remaining stock (> 0) so the UI never offers out-of-stock items.
 */
export async function getAvailableWalkInItems(
  stallId: string,
  serviceDate: string,
  batchId: string | null,
): Promise<AvailableWalkInItem[]> {
  if (!batchId) {
    // Untracked mode: only show meals from the published menu for this stall + date.
    // If no menu is published, there's nothing to sell.
    const { data: menuData, error: menuError } = await supabase
      .from('menu_schedules')
      .select('id')
      .eq('stall_id', stallId)
      .eq('menu_date', serviceDate)
      .eq('is_published', true)
      .single();

    if (menuError || !menuData) {
      console.warn('[GET AVAILABLE ITEMS - NO PUBLISHED MENU]', { stallId, serviceDate, menuError });
      return []; // No published menu → no items to sell
    }

    const { data, error } = await supabase
      .from('menu_schedule_items')
      .select(`
        meal_id,
        meals!inner (
          id,
          name,
          category,
          price
        )
      `)
      .eq('menu_schedule_id', menuData.id)
      .neq('meals.category', 'combo');

    if (error) {
      console.error('[GET AVAILABLE ITEMS ERROR - untracked]', error);
      throw new Error('Failed to fetch available items');
    }

    return (data as any[]).map(item => ({
      meal_id:   item.meals.id,
      meal_name: item.meals.name,
      category:  item.meals.category,
      available: 999, // Untracked — no stock limit enforced
      unit_price: item.meals.price,
    }));
  }


  const { data, error } = await supabase
    .from('live_inventory_status')
    .select('meal_id, meal_name, category, available, unit_price')
    .eq('stall_id', stallId)
    .eq('inventory_date', serviceDate)
    .eq('batch_id', batchId)
    .neq('category', 'combo')
    .gt('available', 0)
    .order('meal_name');

  if (error) {
    console.error('[GET AVAILABLE ITEMS ERROR - tracked]', error);
    throw new Error('Failed to fetch available items');
  }

  return data as AvailableWalkInItem[];
}

// ─── Summary ──────────────────────────────────────────────────

/**
 * Compute today's walk-in sales count and total revenue for a stall.
 * Returns `{ count: 0, revenue: 0 }` on error so the UI never breaks.
 */
export async function getWalkInSalesSummary(
  stallId: string,
  serviceDate: string,
): Promise<{ count: number; revenue: number }> {
  const { data, error } = await supabase
    .from('walk_in_orders')
    .select('total_amount')
    .eq('stall_id', stallId)
    .eq('service_date', serviceDate);

  if (error) {
    console.error('[GET WALK-IN SUMMARY ERROR]', error);
    return { count: 0, revenue: 0 };
  }

  const count = data.length;
  const revenue = data.reduce((sum, order) => sum + Number(order.total_amount), 0);

  return { count, revenue };
}
