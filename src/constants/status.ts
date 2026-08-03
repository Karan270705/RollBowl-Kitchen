import { Ionicons } from '@expo/vector-icons';
import { Colors } from './theme';

export type SemanticStatusCategory =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'subscription'
  | 'walk_in'
  | 'cash'
  | 'upi'
  | 'neutral'
  | 'danger';

export interface StatusVisualConfig {
  label: string;
  foregroundColor: string;
  backgroundColor: string;
  borderColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
  semanticCategory: SemanticStatusCategory;
}

export const STATUS_VISUAL_MAP: Record<string, StatusVisualConfig> = {
  // --- ORDER STATUS ---
  pending: {
    label: 'Pending',
    foregroundColor: '#F59E0B', // amber
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: 'time-outline',
    semanticCategory: 'pending',
  },
  confirmed: {
    label: 'Confirmed',
    foregroundColor: '#3B82F6', // blue
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: 'checkmark-circle-outline',
    semanticCategory: 'confirmed',
  },
  preparing: {
    label: 'Preparing',
    foregroundColor: '#F5A623', // orange
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    borderColor: 'rgba(245, 166, 35, 0.3)',
    icon: 'flame-outline',
    semanticCategory: 'preparing',
  },
  ready: {
    label: 'Ready',
    foregroundColor: '#10B981', // green/teal
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'checkmark-done-outline',
    semanticCategory: 'ready',
  },
  'picked up': {
    label: 'Picked Up',
    foregroundColor: '#10B981', // green
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    icon: 'bag-check-outline',
    semanticCategory: 'completed',
  },
  picked_up: {
    label: 'Picked Up',
    foregroundColor: '#10B981', // green
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    icon: 'bag-check-outline',
    semanticCategory: 'completed',
  },
  completed: {
    label: 'Completed',
    foregroundColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'checkmark-done-circle-outline',
    semanticCategory: 'completed',
  },
  delivered: {
    label: 'Delivered',
    foregroundColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'car-outline',
    semanticCategory: 'completed',
  },
  cancelled: {
    label: 'Cancelled',
    foregroundColor: '#EF4444', // red
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: 'close-circle-outline',
    semanticCategory: 'cancelled',
  },
  expired: {
    label: 'Expired',
    foregroundColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: 'time-outline',
    semanticCategory: 'cancelled',
  },

  // --- PAYMENT METHODS ---
  cash: {
    label: 'Cash at Pickup',
    foregroundColor: '#F59E0B', // amber
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    icon: 'cash-outline',
    semanticCategory: 'cash',
  },
  upi: {
    label: 'UPI',
    foregroundColor: '#8B5CF6', // violet / indigo
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    icon: 'qr-code-outline',
    semanticCategory: 'upi',
  },
  subscription: {
    label: 'Subscription',
    foregroundColor: '#8B5CF6', // violet / indigo
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    icon: 'card-outline',
    semanticCategory: 'subscription',
  },

  // --- PAYMENT VERIFICATION STATUSES ---
  awaiting_proof: {
    label: 'UPI Proof Required',
    foregroundColor: '#F59E0B', // amber
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: 'alert-circle-outline',
    semanticCategory: 'pending',
  },
  'awaiting proof': {
    label: 'UPI Proof Required',
    foregroundColor: '#F59E0B', // amber
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: 'alert-circle-outline',
    semanticCategory: 'pending',
  },
  verification_pending: {
    label: 'UPI Verification Pending',
    foregroundColor: '#3B82F6', // blue
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: 'shield-checkmark-outline',
    semanticCategory: 'confirmed',
  },
  'verification pending': {
    label: 'UPI Verification Pending',
    foregroundColor: '#3B82F6', // blue
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: 'shield-checkmark-outline',
    semanticCategory: 'confirmed',
  },
  pending_verification: {
    label: 'UPI Verification Pending',
    foregroundColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: 'shield-checkmark-outline',
    semanticCategory: 'confirmed',
  },
  verified: {
    label: 'UPI Verified',
    foregroundColor: '#10B981', // green
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'checkmark-circle-outline',
    semanticCategory: 'completed',
  },
  approved: {
    label: 'Approved',
    foregroundColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'checkmark-circle-outline',
    semanticCategory: 'completed',
  },
  rejected: {
    label: 'UPI Rejected',
    foregroundColor: '#EF4444', // red
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: 'ban-outline',
    semanticCategory: 'danger',
  },
  not_required: {
    label: 'Not Required',
    foregroundColor: '#94A3B8', // neutral slate
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    icon: 'checkmark-outline',
    semanticCategory: 'neutral',
  },

  // --- ORDER TYPES ---
  pre_order: {
    label: 'Direct Order',
    foregroundColor: '#3B82F6', // blue
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    icon: 'bag-outline',
    semanticCategory: 'confirmed',
  },
  on_stall: {
    label: 'Direct Order',
    foregroundColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    icon: 'storefront-outline',
    semanticCategory: 'confirmed',
  },
  walk_in: {
    label: 'Walk-in Sale',
    foregroundColor: '#06B6D4', // cyan/teal
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    icon: 'people-outline',
    semanticCategory: 'walk_in',
  },

  // --- INVENTORY / OPERATIONAL ---
  active: {
    label: 'Active',
    foregroundColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'radio-button-on-outline',
    semanticCategory: 'ready',
  },
  inactive: {
    label: 'Inactive',
    foregroundColor: '#6B7280',
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    icon: 'radio-button-off-outline',
    semanticCategory: 'neutral',
  },
  'low stock': {
    label: 'Low Stock',
    foregroundColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: 'warning-outline',
    semanticCategory: 'pending',
  },
  low_stock: {
    label: 'Low Stock',
    foregroundColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: 'warning-outline',
    semanticCategory: 'pending',
  },
  'sold out': {
    label: 'Sold Out',
    foregroundColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: 'remove-circle-outline',
    semanticCategory: 'danger',
  },
  sold_out: {
    label: 'Sold Out',
    foregroundColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: 'remove-circle-outline',
    semanticCategory: 'danger',
  },
};

/**
 * Normalizes a status string and returns its visual mapping.
 * Never exposes raw backend enums — returns friendly labels and accessible colors.
 */
export function getStatusVisual(status?: string): StatusVisualConfig {
  if (!status) {
    return {
      label: 'Unknown',
      foregroundColor: Colors.textSecondary,
      backgroundColor: Colors.surfaceRaised,
      borderColor: Colors.border,
      icon: 'help-circle-outline',
      semanticCategory: 'neutral',
    };
  }

  const normalized = status.trim().toLowerCase();
  const found = STATUS_VISUAL_MAP[normalized];
  if (found) return found;

  // Title-case friendly label fallback for unknown statuses
  const friendlyLabel = normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    label: friendlyLabel,
    foregroundColor: Colors.textSecondary,
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.border,
    icon: 'information-circle-outline',
    semanticCategory: 'neutral',
  };
}

/**
 * Helper to determine user-friendly Payment State text and color based on order fields
 */
export function getPaymentStateVisual(
  orderType: string,
  paymentMethod: string,
  paymentStatus: string,
  verificationStatus?: string
): StatusVisualConfig {
  if (orderType === 'subscription' || paymentMethod === 'subscription') {
    return {
      label: 'Covered by Subscription',
      foregroundColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      icon: 'card-outline',
      semanticCategory: 'subscription',
    };
  }

  if (paymentMethod === 'upi') {
    if (verificationStatus === 'rejected') {
      return {
        label: 'UPI Rejected',
        foregroundColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        icon: 'ban-outline',
        semanticCategory: 'danger',
      };
    }
    if (verificationStatus === 'verified' || paymentStatus === 'paid') {
      return {
        label: 'UPI Verified',
        foregroundColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        icon: 'checkmark-circle-outline',
        semanticCategory: 'completed',
      };
    }
    if (verificationStatus === 'pending_verification' || verificationStatus === 'verification_pending') {
      return {
        label: 'UPI Verification Pending',
        foregroundColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        icon: 'shield-checkmark-outline',
        semanticCategory: 'confirmed',
      };
    }
    return {
      label: 'UPI Proof Required',
      foregroundColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      icon: 'alert-circle-outline',
      semanticCategory: 'pending',
    };
  }

  // Default Cash at Pickup
  return {
    label: 'Cash at Pickup',
    foregroundColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    icon: 'cash-outline',
    semanticCategory: 'cash',
  };
}
