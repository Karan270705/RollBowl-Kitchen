-- ============================================================
-- Migration 056: Fix Menu Schedule Items RLS
-- ============================================================
-- Replaces is_staff_of_stall() check on menu_schedule_items
-- with role-based check. menu_schedules already has correct
-- policy (menu_schedules_kitchen_all) so we skip it.
--
-- Preserves customer_select policies for public menu access.
-- ============================================================

BEGIN;

-- Drop staff-based policy on menu_schedule_items
DROP POLICY IF EXISTS menu_schedule_items_staff_all ON public.menu_schedule_items;

-- Create role-based policy for kitchen users
CREATE POLICY menu_schedule_items_kitchen_all ON public.menu_schedule_items
  FOR ALL
  USING    (get_user_role() IN ('kitchen', 'stall_operator'))
  WITH CHECK (get_user_role() IN ('kitchen', 'stall_operator'));

COMMIT;
