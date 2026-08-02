-- Issue #6: Walk-in Sales in Order History
-- Migration: Add payment_method and unit_price to inventory_movements
-- 
-- These columns are only populated for walk_in_sale movements.
-- Existing rows retain NULL for both (backward-compatible).

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS unit_price numeric;

-- Optional: Add a check constraint for valid payment methods
ALTER TABLE inventory_movements
  ADD CONSTRAINT chk_payment_method 
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'upi'));

COMMENT ON COLUMN inventory_movements.payment_method IS 'Payment method for walk-in sales (cash/upi). NULL for non-sale movements.';
COMMENT ON COLUMN inventory_movements.unit_price IS 'Unit price at time of walk-in sale. NULL for non-sale movements.';
