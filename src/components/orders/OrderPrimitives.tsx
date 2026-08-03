import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { getStatusVisual, StatusVisualConfig } from '@/src/constants/status';

/**
 * 1. OrderStatusBadge — Large, readable Order Status badge (12-13px semibold) that never overflows.
 */
export interface OrderStatusBadgeProps {
  status: string;
  label?: string;
  style?: ViewStyle | ViewStyle[];
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  label,
  style,
}) => {
  const visual = getStatusVisual(status);
  const displayLabel =
    label ||
    (status === 'confirmed'
      ? 'ACCEPTED'
      : visual.label.toUpperCase());

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Order status: ${displayLabel}`}
    >
      {visual.icon && (
        <Ionicons
          name={visual.icon}
          size={13}
          color={visual.foregroundColor}
          style={styles.statusIcon}
        />
      )}
      <Text
        style={[
          styles.statusBadgeText,
          { color: visual.foregroundColor },
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

/**
 * 2. OrderInfoRow — Compact labeled row for operational scanning
 */
export interface OrderInfoRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  style?: ViewStyle | ViewStyle[];
}

export const OrderInfoRow: React.FC<OrderInfoRowProps> = ({
  icon,
  label,
  value,
  valueColor = Colors.textPrimary,
  style,
}) => {
  return (
    <View style={[styles.infoRow, style]}>
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={Colors.textSecondary}
          style={styles.infoRowIcon}
        />
      )}
      <Text style={styles.infoRowLabel} numberOfLines={1}>
        {label}:
      </Text>
      <Text
        style={[styles.infoRowValue, { color: valueColor }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
};

/**
 * 3. OrderInfoGrid — Two-column information grid for Order Type, Pickup Slot, and Payment State.
 * Ensures operational facts are readable without squinting (labels 12-13, values 14-15).
 */
export interface OrderInfoGridProps {
  orderTypeLabel: string;
  orderTypeColor: string;
  pickupSlot?: string;
  paymentStateLabel: string;
  paymentStateColor: string;
  style?: ViewStyle | ViewStyle[];
}

export const OrderInfoGrid: React.FC<OrderInfoGridProps> = ({
  orderTypeLabel,
  orderTypeColor,
  pickupSlot,
  paymentStateLabel,
  paymentStateColor,
  style,
}) => {
  return (
    <View style={[styles.infoGrid, style]}>
      <View style={styles.infoColumn}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>ORDER TYPE</Text>
          <Text
            style={[styles.gridValue, { color: orderTypeColor }]}
            numberOfLines={1}
          >
            {orderTypeLabel}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>PAYMENT</Text>
          <Text
            style={[styles.gridValue, { color: paymentStateColor }]}
            numberOfLines={1}
          >
            {paymentStateLabel}
          </Text>
        </View>
      </View>

      <View style={styles.infoColumnRight}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>PICKUP SLOT</Text>
          <Text
            style={[styles.gridValue, { color: '#94A3B8' }]}
            numberOfLines={1}
          >
            {pickupSlot || 'Immediate'}
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * 4. PaymentStateBlock — Inline warning block for rejected UPI payment proof.
 * Replaces tiny overflowing pills with a clear, actionable warning block.
 */
export interface PaymentStateBlockProps {
  isRejected?: boolean;
  rejectionReason?: string;
  paymentMethod: string;
  verificationStatus?: string;
  style?: ViewStyle | ViewStyle[];
}

export const PaymentStateBlock: React.FC<PaymentStateBlockProps> = ({
  isRejected,
  rejectionReason,
  paymentMethod,
  verificationStatus,
  style,
}) => {
  const rejected =
    isRejected ||
    (paymentMethod === 'upi' && verificationStatus === 'rejected');

  if (!rejected) return null;

  return (
    <View style={[styles.rejectionBlock, style]}>
      <View style={styles.rejectionHeader}>
        <Ionicons name="alert-circle" size={16} color="#EF4444" />
        <Text style={styles.rejectionTitle}>Payment proof rejected</Text>
      </View>
      <Text style={styles.rejectionBody}>
        Awaiting a corrected screenshot from the customer.
      </Text>
      {rejectionReason ? (
        <View style={styles.reasonWrap}>
          <Text style={styles.reasonText}>
            Reason: <Text style={styles.reasonBold}>{rejectionReason}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/**
 * 5. OrderItemRow — Ordered items row with bounded quantity column and wrapping meal name.
 */
export interface OrderItemRowProps {
  quantity: number;
  mealName: string;
  specialInstructions?: string;
  style?: ViewStyle | ViewStyle[];
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  quantity,
  mealName,
  specialInstructions,
  style,
}) => {
  return (
    <View style={[styles.itemRow, style]}>
      <View style={styles.quantityCol}>
        <Text style={styles.quantityText}>{quantity} ×</Text>
      </View>
      <View style={styles.itemDetailsCol}>
        <Text style={styles.mealNameText} numberOfLines={2} ellipsizeMode="tail">
          {mealName}
        </Text>
        {specialInstructions ? (
          <Text style={styles.itemNotesText} numberOfLines={2}>
            Note: {specialInstructions}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * 6. OrderActionGroup — Container for card action buttons with vertical stacking on narrow widths.
 */
export interface OrderActionGroupProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const OrderActionGroup: React.FC<OrderActionGroupProps> = ({
  children,
  style,
}) => {
  return <View style={[styles.actionGroup, style]}>{children}</View>;
};

/**
 * 7. CompactFilterChip — Clean horizontally scrollable filter chip for top tabs.
 */
export interface CompactFilterChipProps {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
  activeColor?: string;
  style?: ViewStyle | ViewStyle[];
}

export const CompactFilterChip: React.FC<CompactFilterChipProps> = ({
  label,
  count,
  active,
  onPress,
  activeColor = Colors.primary,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && {
          backgroundColor: activeColor + '20',
          borderColor: activeColor,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.filterChipText,
          active && {
            color: activeColor,
            fontFamily: Typography.family.semiBold,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={[
            styles.filterCountBadge,
            active && { backgroundColor: activeColor },
          ]}
        >
          <Text
            style={[
              styles.filterCountText,
              active && { color: Colors.background },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * 8. OrderSummaryGrid — Replaces legacy summary with Subscription Plan, Credits Used, Customer Pays, Payment Method, and Pickup Slot.
 * Visual hierarchy: Plan (purple #8B5CF6), Credits/Subscription (green #10B981), Payment (orange #F59E0B), Pickup (blue #3B82F6).
 */
export interface OrderSummaryGridProps {
  subscriptionPlanName?: string;
  creditsUsed?: number;
  customerPays: number;
  paymentMethodLabel: string;
  pickupSlot?: string;
  style?: ViewStyle | ViewStyle[];
}

export const OrderSummaryGrid: React.FC<OrderSummaryGridProps> = ({
  subscriptionPlanName,
  creditsUsed,
  customerPays,
  paymentMethodLabel,
  pickupSlot,
  style,
}) => {
  const hasPlan = Boolean(
    subscriptionPlanName &&
      subscriptionPlanName !== '-' &&
      subscriptionPlanName !== 'None'
  );
  const hasCredits = Boolean(creditsUsed != null && creditsUsed > 0);

  return (
    <View style={[styles.summaryGridContainer, style]}>
      <Text style={styles.summaryGridHeaderTitle}>Order Summary</Text>

      <View style={styles.summaryGridRow}>
        <View style={styles.summaryGridCell}>
          <Text style={styles.gridLabel}>SUBSCRIPTION PLAN</Text>
          <Text
            style={[
              styles.gridValue,
              { color: hasPlan ? '#8B5CF6' : Colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {subscriptionPlanName || '-'}
          </Text>
        </View>
        <View style={styles.summaryGridCell}>
          <Text style={styles.gridLabel}>CREDITS USED</Text>
          <Text
            style={[
              styles.gridValue,
              { color: hasCredits ? '#10B981' : Colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {hasCredits ? `${creditsUsed}` : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryGridRow}>
        <View style={styles.summaryGridCell}>
          <Text style={styles.gridLabel}>CUSTOMER PAYS</Text>
          <Text
            style={[styles.gridValue, { color: '#F59E0B' }]}
            numberOfLines={1}
          >
            ₹{customerPays.toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryGridCell}>
          <Text style={styles.gridLabel}>PAYMENT METHOD</Text>
          <Text
            style={[styles.gridValue, { color: '#F59E0B' }]}
            numberOfLines={1}
          >
            {paymentMethodLabel}
          </Text>
        </View>
      </View>

      <View style={styles.summaryGridRowFull}>
        <View style={styles.summaryGridCell}>
          <Text style={styles.gridLabel}>PICKUP SLOT</Text>
          <Text
            style={[styles.gridValue, { color: '#3B82F6' }]}
            numberOfLines={1}
          >
            {pickupSlot || 'Immediate'}
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * 9. SubscriptionSection — Section 1 for mixed orders or pure subscription orders.
 * Shows green checkmarks (✓), credits used, and green accent visual hierarchy.
 */
export interface SubscriptionSectionProps {
  items: Array<{
    id: string;
    quantity: number;
    mealName: string;
    specialInstructions?: string;
  }>;
  totalCreditsUsed: number;
  style?: ViewStyle | ViewStyle[];
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  items,
  totalCreditsUsed,
  style,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={[styles.subSectionContainer, style]}>
      <View style={styles.subSectionHeader}>
        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
        <Text style={styles.subSectionTitle}>Subscription Items</Text>
      </View>

      <View style={styles.subSectionItems}>
        {items.map((item) => (
          <View key={item.id} style={styles.subItemRow}>
            <Text style={styles.subItemCheck}>✓ </Text>
            <Text style={styles.subItemQuantity}>{item.quantity} ×</Text>
            <View style={styles.itemDetailsCol}>
              <Text style={styles.mealNameText} numberOfLines={2}>
                {item.mealName}
              </Text>
              {item.specialInstructions ? (
                <Text style={styles.itemNotesText}>
                  Note: {item.specialInstructions}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.subSectionFooter}>
        <Text style={styles.subSectionFooterLabel}>Credits Used:</Text>
        <Text style={styles.subSectionFooterValue}>{totalCreditsUsed}</Text>
      </View>
    </View>
  );
};

/**
 * 10. CustomerPaysSection — Section 2 for mixed orders or pure paid items.
 * Shows orange accent visual hierarchy, amount due, and payment method.
 */
export interface CustomerPaysSectionProps {
  items: Array<{
    id: string;
    quantity: number;
    mealName: string;
    totalPrice: number;
    specialInstructions?: string;
  }>;
  totalAmount: number;
  paymentMethodLabel: string;
  title?: string;
  style?: ViewStyle | ViewStyle[];
}

export const CustomerPaysSection: React.FC<CustomerPaysSectionProps> = ({
  items,
  totalAmount,
  paymentMethodLabel,
  title = 'Customer Pays',
  style,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={[styles.paySectionContainer, style]}>
      <View style={styles.paySectionHeader}>
        <Ionicons name="card" size={16} color="#F59E0B" />
        <Text style={styles.paySectionTitle}>{title}</Text>
      </View>

      <View style={styles.paySectionItems}>
        {items.map((item) => (
          <View key={item.id} style={styles.payItemRow}>
            <Text style={styles.subItemQuantity}>{item.quantity} ×</Text>
            <View style={styles.itemDetailsCol}>
              <Text style={styles.mealNameText} numberOfLines={2}>
                {item.mealName}
              </Text>
              {item.specialInstructions ? (
                <Text style={styles.itemNotesText}>
                  Note: {item.specialInstructions}
                </Text>
              ) : null}
            </View>
            <Text style={styles.payItemPrice}>
              ₹{item.totalPrice.toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.paySectionFooter}>
        <Text style={styles.paySectionFooterLabel}>
          Payment Method:{' '}
          <Text style={styles.paySectionFooterMethod}>
            {paymentMethodLabel}
          </Text>
        </Text>
        <Text style={styles.paySectionFooterTotal}>
          ₹{totalAmount.toFixed(0)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.base,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusIcon: {
    marginRight: 5,
  },
  statusBadgeText: {
    fontFamily: Typography.family.semiBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    flexWrap: 'wrap',
  },
  infoRowIcon: {
    marginRight: 6,
  },
  infoRowLabel: {
    fontFamily: Typography.family.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 6,
  },
  infoRowValue: {
    fontFamily: Typography.family.semiBold,
    fontSize: 14,
    flexShrink: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  infoColumn: {
    flex: 1,
    minWidth: 140,
    gap: Spacing.sm,
  },
  infoColumnRight: {
    flexShrink: 0,
    minWidth: 110,
    gap: Spacing.sm,
  },
  gridCell: {
    flexDirection: 'column',
    gap: 2,
  },
  gridLabel: {
    fontFamily: Typography.family.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontFamily: Typography.family.semiBold,
    fontSize: 14,
  },
  rejectionBlock: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectionTitle: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: '#EF4444',
  },
  rejectionBody: {
    fontFamily: Typography.family.regular,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  reasonWrap: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
  reasonText: {
    fontFamily: Typography.family.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  reasonBold: {
    fontFamily: Typography.family.bold,
    color: '#EF4444',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: Spacing.sm,
  },
  quantityCol: {
    flexShrink: 0,
    width: 36,
    alignItems: 'flex-start',
  },
  quantityText: {
    fontFamily: Typography.family.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  itemDetailsCol: {
    flex: 1,
    flexShrink: 1,
  },
  mealNameText: {
    fontFamily: Typography.family.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  itemNotesText: {
    fontFamily: Typography.family.regular,
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 2,
    lineHeight: 18,
  },
  actionGroup: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minHeight: 36,
    flexShrink: 0,
  },
  filterChipText: {
    fontFamily: Typography.family.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceRaised,
  },
  filterCountText: {
    fontFamily: Typography.family.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  summaryGridContainer: {
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  summaryGridHeaderTitle: {
    fontFamily: Typography.family.bold,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  summaryGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  summaryGridRowFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  summaryGridCell: {
    flex: 1,
    minWidth: 130,
  },
  subSectionContainer: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginBottom: Spacing.sm,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  subSectionTitle: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: '#10B981',
  },
  subSectionItems: {
    gap: 8,
    marginBottom: 8,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  subItemCheck: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: '#10B981',
    width: 18,
  },
  subItemQuantity: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    width: 28,
  },
  subSectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
  },
  subSectionFooterLabel: {
    fontFamily: Typography.family.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  subSectionFooterValue: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: '#10B981',
  },
  paySectionContainer: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    marginBottom: Spacing.sm,
  },
  paySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  paySectionTitle: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: '#F59E0B',
  },
  paySectionItems: {
    gap: 8,
    marginBottom: 8,
  },
  payItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  payItemPrice: {
    fontFamily: Typography.family.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  paySectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  paySectionFooterLabel: {
    fontFamily: Typography.family.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  paySectionFooterMethod: {
    fontFamily: Typography.family.bold,
    color: '#F59E0B',
  },
  paySectionFooterTotal: {
    fontFamily: Typography.family.bold,
    fontSize: 15,
    color: '#F59E0B',
  },
});
