/**
 * RollBowl Kitchen — Walk-In Sale Types
 * Types for Phase 2: Walk-In Sale Service Layer & Hooks
 */

export interface WalkInOrderItem {
  meal_id: string;
  meal_name: string;
  quantity: number;
  unit_price: number;
}

export interface WalkInOrder {
  id: string;
  stall_id: string;
  order_number: string;
  service_date: string;
  batch_id: string | null;
  items: WalkInOrderItem[];
  total_amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'other';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWalkInOrderInput {
  stallId: string;
  serviceDate: string;
  batchId: string | null;
  items: {
    meal_id: string;
    quantity: number;
    unit_price: number;
  }[];
  paymentMethod: 'cash' | 'upi' | 'card' | 'other';
  notes?: string;
}

export interface CreateWalkInOrderResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  total: number;
}

export interface AvailableWalkInItem {
  meal_id: string;
  meal_name: string;
  category: string;
  available: number; // Net available (after pre-orders); 999 = untracked mode
  unit_price: number;
}
