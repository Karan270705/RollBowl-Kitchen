-- ============================================================
-- Migration 055: Global Meals Catalog
-- ============================================================
-- Makes meals catalog global (shared across all stalls).
-- Published menus remain per-stall via menu_schedules.stall_id.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Deduplicate meals before dropping stall_id
--    Keep one instance of each unique (name, category) pair —
--    the earliest-created row wins.
-- ============================================================

-- Deduplicated set: first occurrence of each (name, category)
CREATE TEMP TABLE deduplicated_meals AS
SELECT DISTINCT ON (name, category)
  id,
  name,
  category,
  created_at
FROM public.meals
ORDER BY name, category, created_at ASC;

-- Mapping: every old meal ID → the canonical (kept) meal ID
CREATE TEMP TABLE meal_id_mapping AS
SELECT
  m.id   AS old_id,
  dm.id  AS new_id
FROM public.meals m
INNER JOIN deduplicated_meals dm
  ON  m.name     = dm.name
  AND m.category = dm.category;

-- Redirect menu_schedule_items to point at the canonical meal IDs
UPDATE public.menu_schedule_items msi
SET meal_id = mapping.new_id
FROM meal_id_mapping mapping
WHERE msi.meal_id  = mapping.old_id
  AND msi.meal_id != mapping.new_id;  -- skip rows already correct

-- Remove duplicate meal rows (keep only the canonical ones)
DELETE FROM public.meals
WHERE id NOT IN (SELECT id FROM deduplicated_meals);

-- ============================================================
-- 2. Drop the stall_id column from meals
-- ============================================================

ALTER TABLE public.meals
  DROP COLUMN IF EXISTS stall_id;

-- ============================================================
-- 3. Performance indexes for global catalog queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_meals_name         ON public.meals (name);
CREATE INDEX IF NOT EXISTS idx_meals_category     ON public.meals (category);
CREATE INDEX IF NOT EXISTS idx_meals_is_available ON public.meals (is_available);

-- ============================================================
-- 4. Refresh RLS for the global catalog
--    Migration 054 already created meals_kitchen_all.
--    We recreate it here to ensure correctness (idempotent).
-- ============================================================

DROP POLICY IF EXISTS meals_kitchen_all ON public.meals;

CREATE POLICY meals_kitchen_all ON public.meals
  FOR ALL
  USING    (get_user_role() IN ('kitchen', 'stall_operator'))
  WITH CHECK (get_user_role() IN ('kitchen', 'stall_operator'));

-- Allow customers to view available meals (global catalog)
CREATE POLICY meals_customer_select ON public.meals
  FOR SELECT
  USING (is_available = true);

-- Customers retain pre-existing SELECT access to available meals
-- (no change to customer-facing policies needed).

COMMIT;

-- ============================================================
-- Verification queries (run after applying in Supabase SQL Editor):
--
-- -- stall_id should be gone
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'meals' AND column_name = 'stall_id';
-- -- Expected: 0 rows
--
-- -- No duplicate meal names within a category
-- SELECT name, category, COUNT(*) FROM meals
-- GROUP BY name, category HAVING COUNT(*) > 1;
-- -- Expected: 0 rows
--
-- -- Spot-check total catalog count
-- SELECT COUNT(*) AS total_meals FROM meals;
-- ============================================================
