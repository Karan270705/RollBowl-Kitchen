/**
 * RollBowl Kitchen — Data Models
 * Minimal types for Phase 1 + Menu Management.
 */

import { UserRole, MealCategory, MealType } from '@/src/constants/enums';

// ─── Users ───────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  collegeId?: string;
  cityId?: string;
  createdAt: string;
}

// ─── Meals ───────────────────────────────────────────────────

export interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: MealCategory;
  type: MealType;
  stallId: string;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  rating: number;
  totalRatings: number;
  preparationTime: number;
  tags: string[];
}

// ─── Menu Schedules ──────────────────────────────────────────

export interface MenuSchedule {
  id: string;
  stallId: string;
  menuDate: string; // YYYY-MM-DD
  visibleFrom: string; // ISO String
  orderCutoff: string; // ISO String
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuScheduleItem {
  id: string;
  menuScheduleId: string;
  mealId: string;
  createdAt: string;
  
  // Joined fields from meals
  meal?: Meal;
}

// ─── Orders ──────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  mealId: string;
  mealName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  subscriptionId?: string;
  creditsUsed?: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  stallId: string;
  stallName: string;
  items?: OrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  orderType: 'pre_order' | 'on_stall' | 'subscription';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  pickupDate: string;
  estimatedReadyTime?: string;
  createdAt: string;
  updatedAt: string;
}
