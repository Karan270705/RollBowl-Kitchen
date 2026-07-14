-- ============================================================
-- 1. DUPLICATE DIAGNOSTIC
-- ============================================================
-- Find any existing duplicate meal_id entries in the same inventory_batch_id
SELECT inventory_batch_id, meal_id, COUNT(*) as duplicate_count
FROM inventory_batch_items
GROUP BY inventory_batch_id, meal_id
HAVING COUNT(*) > 1;

-- ============================================================
-- 2. UNIQUE CONSTRAINT
-- ============================================================
-- Only run this AFTER ensuring the above diagnostic returns 0 rows!
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_batch_items_batch_meal_key'
  ) THEN
    ALTER TABLE inventory_batch_items
    ADD CONSTRAINT inventory_batch_items_batch_meal_key UNIQUE (inventory_batch_id, meal_id);
  END IF;
END $$;

-- ============================================================
-- 3. TRIGGER VALIDATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION validate_inventory_batch_item_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_meal meals%ROWTYPE;
  v_menu_schedule_id UUID;
  v_batch_id UUID;
BEGIN
  -- Determine batch ID based on operation
  IF TG_OP = 'DELETE' THEN
    v_batch_id := OLD.inventory_batch_id;
  ELSE
    v_batch_id := NEW.inventory_batch_id;
  END IF;

  -- 1. Verify batch exists
  SELECT * INTO v_batch FROM inventory_batches WHERE id = v_batch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'BATCH_NOT_FOUND',
        'message', 'The referenced inventory batch does not exist.'
      )::text;
  END IF;

  -- 2. Verify batch is draft
  IF v_batch.status != 'draft' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'BATCH_NOT_DRAFT',
        'message', 'Inventory batch items can only be modified when the batch is in draft status.'
      )::text;
  END IF;

  -- 3. If DELETE, we are done validating. Staff can remove invalid draft items.
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- For INSERT and UPDATE, perform published-menu validation
  
  -- 4. Verify meal exists and gets its stall_id
  SELECT * INTO v_meal FROM meals WHERE id = NEW.meal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'MEAL_NOT_FOUND',
        'message', 'The referenced meal does not exist.'
      )::text;
  END IF;

  -- 5. Verify meal belongs to the same stall as the batch
  IF v_meal.stall_id != v_batch.stall_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'MEAL_STALL_MISMATCH',
        'message', 'Meal does not belong to this stall.'
      )::text;
  END IF;

  -- 6. Verify meal is available
  IF NOT v_meal.is_available THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'MEAL_NOT_AVAILABLE',
        'message', 'Meal is currently unavailable.'
      )::text;
  END IF;

  -- 7. Verify a published menu schedule exists for this stall and date
  SELECT id INTO v_menu_schedule_id
  FROM menu_schedules
  WHERE stall_id = v_batch.stall_id
    AND menu_date = v_batch.inventory_date
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'MENU_NOT_PUBLISHED',
        'message', 'No menu has been published for this date.'
      )::text;
  END IF;

  -- 8. Verify the meal is included in the published schedule
  IF NOT EXISTS (
    SELECT 1 FROM menu_schedule_items 
    WHERE menu_schedule_id = v_menu_schedule_id 
      AND meal_id = NEW.meal_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'MEAL_NOT_IN_PUBLISHED_MENU',
        'message', 'Meal is not included in the published menu for this batch date.',
        'meal_id', NEW.meal_id,
        'batch_id', NEW.inventory_batch_id
      )::text;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS trg_validate_inventory_batch_item_modification ON inventory_batch_items;

CREATE TRIGGER trg_validate_inventory_batch_item_modification
BEFORE INSERT OR UPDATE OR DELETE ON inventory_batch_items
FOR EACH ROW
EXECUTE FUNCTION validate_inventory_batch_item_modification();


-- ============================================================
-- 4. ACTIVATE RPC REVALIDATION UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION activate_inventory_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_conflicting_batch_id UUID;
  v_deficits JSONB;
  v_menu_schedule_id UUID;
  v_invalid_items JSONB;
BEGIN
  -- 1. Verify batch exists and get lock
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory batch not found.';
  END IF;

  -- 2. Verify authorization
  -- Assuming authenticated users calling this via Kitchen App are authorized for now.

  -- 3. Verify batch is currently draft
  IF v_batch.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft batches can be activated.';
  END IF;

  -- 4. Verify there are valid inventory items
  IF NOT EXISTS (SELECT 1 FROM inventory_batch_items WHERE inventory_batch_id = p_batch_id) THEN
    RAISE EXCEPTION 'Cannot activate an empty inventory batch.';
  END IF;

  -- 4.5. Revalidate items against Published Menu
  -- A. Ensure published menu exists
  SELECT id INTO v_menu_schedule_id
  FROM menu_schedules
  WHERE stall_id = v_batch.stall_id
    AND menu_date = v_batch.inventory_date
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'MENU_NOT_PUBLISHED',
        'message', 'No menu has been published for this date.'
      )::text;
  END IF;

  -- B. Check for invalid items (not in menu, unavailable, stall mismatch)
  SELECT jsonb_agg(
    jsonb_build_object(
      'meal_id', ibi.meal_id,
      'meal_name', COALESCE(m.name, 'Unknown'),
      'reason', CASE
        WHEN m.id IS NULL THEN 'MEAL_NOT_FOUND'
        WHEN m.stall_id != v_batch.stall_id THEN 'MEAL_STALL_MISMATCH'
        WHEN NOT m.is_available THEN 'MEAL_NOT_AVAILABLE'
        WHEN msi.id IS NULL THEN 'MEAL_NOT_IN_PUBLISHED_MENU'
        ELSE 'UNKNOWN_ERROR'
      END
    )
  ) INTO v_invalid_items
  FROM inventory_batch_items ibi
  LEFT JOIN meals m ON m.id = ibi.meal_id
  LEFT JOIN menu_schedule_items msi ON msi.menu_schedule_id = v_menu_schedule_id AND msi.meal_id = ibi.meal_id
  WHERE ibi.inventory_batch_id = p_batch_id
    AND (m.id IS NULL OR m.stall_id != v_batch.stall_id OR NOT m.is_available OR msi.id IS NULL);

  IF v_invalid_items IS NOT NULL AND jsonb_array_length(v_invalid_items) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = jsonb_build_object(
        'code', 'INVALID_BATCH_MENU_ITEMS',
        'message', 'Some batch items are not valid for the published menu.',
        'items', v_invalid_items
      )::text;
  END IF;

  -- 5. Enforce no competing active batch for the same stall/date/window
  SELECT id INTO v_conflicting_batch_id
  FROM inventory_batches
  WHERE stall_id = v_batch.stall_id
    AND inventory_date = v_batch.inventory_date
    AND window_start = v_batch.window_start
    AND window_end = v_batch.window_end
    AND status = 'active'
    AND id != p_batch_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Another active batch already exists for this stall, date, and window.';
  END IF;

  -- 6. Detect reserved deficits
  SELECT jsonb_agg(
    jsonb_build_object(
      'meal_id', lis.meal_id,
      'item_name', lis.item_name,
      'deficit', abs(lis.extra_available)
    )
  ) INTO v_deficits
  FROM live_inventory_status lis
  WHERE lis.batch_id = p_batch_id
    AND lis.extra_available < 0;

  -- 7. Set status to active
  UPDATE inventory_batches
  SET status = 'active',
      activated_at = now(),
      updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'deficits', COALESCE(v_deficits, '[]'::jsonb)
  );
END;
$$;
