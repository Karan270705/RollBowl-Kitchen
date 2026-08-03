import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Order, OrderItem } from '@/src/types/models';
import {
  useUpdateOrderStatus,
  useUpdateOrderPaymentStatus,
} from '@/src/hooks/useOrders';
import { useOperationalContext } from '@/src/hooks/useOperationalContext';
import { PaymentProofViewerModal } from '../payments/PaymentProofViewerModal';
import {
  OrderStatusBadge,
  OrderSummaryGrid,
  SubscriptionSection,
  CustomerPaysSection,
  PaymentStateBlock,
  OrderItemRow,
  OrderActionGroup,
} from './OrderPrimitives';
import {
  getStatusVisual,
  getPaymentStateVisual,
} from '@/src/constants/status';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const { stallId, resolvedOperationalDate } = useOperationalContext(
    order.stallId
  );
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus(
    stallId,
    order.pickupDate || resolvedOperationalDate
  );
  const { mutate: updatePaymentStatus, isPending: isPaymentPending } =
    useUpdateOrderPaymentStatus(
      stallId,
      order.pickupDate || resolvedOperationalDate
    );
  const [isProofModalVisible, setIsProofModalVisible] = useState(false);

  const isUpiOrder = order.paymentMethod === 'upi';
  const isPendingVerification =
    order.paymentVerificationStatus === 'pending';

  // Only show proof button when proof is actually submitted or verified, never when rejected
  const hasProofSubmitted =
    order.paymentVerificationStatus === 'pending' ||
    order.paymentVerificationStatus === 'verified';

  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return {
          label: 'Accept Order',
          nextStatus: 'confirmed' as const,
          color: '#3B82F6', // semantic blue for confirmed/accepting
        };
      case 'confirmed':
      case 'preparing':
        return {
          label: 'Mark Ready',
          nextStatus: 'ready' as const,
          color: '#F5A623', // semantic orange/amber
        };
      case 'ready':
        return {
          label: 'Mark Collected',
          nextStatus: 'picked_up' as const,
          color: '#10B981', // semantic green
        };
      default:
        return null;
    }
  };

  const action = getNextAction();

  const isAcceptAction = action && action.nextStatus === 'confirmed';
  const isCollectAction = action && action.nextStatus === 'picked_up';

  const isUpiUnverified =
    isUpiOrder &&
    order.paymentVerificationStatus !== 'verified' &&
    order.paymentVerificationStatus !== 'not_required';

  const isCashUnpaid =
    order.paymentMethod === 'cash' && order.paymentStatus !== 'paid';

  const showAcceptButton = action && !(isAcceptAction && isUpiUnverified);

  const handleAction = () => {
    if (action) {
      updateStatus({ orderId: order.id, status: action.nextStatus });
    }
  };

  // Resolve visual properties
  const orderTypeVisual = getStatusVisual(
    order.orderType === 'subscription' ? 'subscription' : 'pre_order'
  );
  const paymentVisual = getPaymentStateVisual(
    order.orderType,
    order.paymentMethod,
    order.paymentStatus,
    order.paymentVerificationStatus
  );

  const subscriptionItems = (order.items || []).filter(
    (item) =>
      Boolean(item.subscriptionId) ||
      (order.orderType === 'subscription' && item.unitPrice === 0)
  );
  const paidItems = (order.items || []).filter(
    (item) =>
      !Boolean(item.subscriptionId) &&
      !(order.orderType === 'subscription' && item.unitPrice === 0)
  );
  const isMixedOrder = subscriptionItems.length > 0 && paidItems.length > 0;
  const isPureSubOrder =
    subscriptionItems.length > 0 && paidItems.length === 0;
  const paidItemsTotal = paidItems.reduce(
    (acc, i) => acc + (i.totalPrice || 0),
    0
  );

  return (
    <View style={styles.card}>
      {/* Section A: Header Row (Customer Name + Order Number left, Status badge right) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.customerName} numberOfLines={1}>
            {order.customerName}
          </Text>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      {/* Section B: Order Summary Grid (Replaces OrderInfoGrid) */}
      <OrderSummaryGrid
        subscriptionPlanName={order.subscriptionPlanName}
        creditsUsed={order.creditsUsed}
        customerPays={
          isPureSubOrder ? 0 : isMixedOrder ? paidItemsTotal : order.total
        }
        paymentMethodLabel={paymentVisual.label}
        pickupSlot={order.expectedPickupSlot || 'Immediate'}
      />

      {/* Inline Rejection Warning Block if UPI Rejected */}
      <PaymentStateBlock
        paymentMethod={order.paymentMethod}
        verificationStatus={order.paymentVerificationStatus}
        rejectionReason={(order as any).rejectionReason}
      />

      {/* Section C: Ordered Items - Distinct Sections for Mixed, Pure Sub, or Paid */}
      {isMixedOrder ? (
        <View style={styles.itemsList}>
          <SubscriptionSection
            items={subscriptionItems}
            totalCreditsUsed={order.creditsUsed || 0}
          />
          <CustomerPaysSection
            items={paidItems}
            totalAmount={paidItemsTotal}
            paymentMethodLabel={paymentVisual.label}
            title="Customer Pays"
          />
        </View>
      ) : isPureSubOrder ? (
        <View style={styles.itemsList}>
          <SubscriptionSection
            items={subscriptionItems}
            totalCreditsUsed={order.creditsUsed || 0}
          />
        </View>
      ) : (
        <View style={styles.itemsList}>
          <CustomerPaysSection
            items={paidItems.length > 0 ? paidItems : order.items || []}
            totalAmount={order.total}
            paymentMethodLabel={paymentVisual.label}
            title="Order Items"
          />
        </View>
      )}

      {/* Optional Order Notes */}
      {order.notes ? (
        <View style={styles.orderNotes}>
          <Ionicons
            name="document-text-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.orderNotesText}>{order.notes}</Text>
        </View>
      ) : null}

      {/* Section D: Contextual Action Section */}
      {(showAcceptButton ||
        (isCollectAction && isCashUnpaid) ||
        (isUpiOrder && hasProofSubmitted) ||
        (isAcceptAction && isUpiUnverified)) && (
        <OrderActionGroup>
          {/* 1. UPI Proof Submitted: View Payment Proof */}
          {isUpiOrder && hasProofSubmitted && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                isPendingVerification
                  ? styles.actionButtonPrimary
                  : styles.actionButtonSecondary,
              ]}
              onPress={() => setIsProofModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-attach-outline"
                size={18}
                color={
                  isPendingVerification
                    ? Colors.white
                    : Colors.textPrimary
                }
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color: isPendingVerification
                      ? Colors.white
                      : Colors.textPrimary,
                  },
                ]}
              >
                {isPendingVerification
                  ? 'View Payment Proof'
                  : 'View Verified Proof'}
              </Text>
            </TouchableOpacity>
          )}

          {/* 2. Cash unpaid when collecting: Mark as Paid */}
          {isCollectAction && isCashUnpaid && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={() =>
                updatePaymentStatus({ orderId: order.id, status: 'paid' })
              }
              disabled={isPaymentPending}
              activeOpacity={0.8}
            >
              {isPaymentPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="cash-outline"
                    size={18}
                    color={Colors.white}
                  />
                  <Text style={styles.actionText}>Mark as Paid</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 3. Accept / Mark Ready / Mark Collected */}
          {showAcceptButton && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    isCollectAction && isCashUnpaid
                      ? Colors.surfaceHighlight
                      : action?.color || Colors.primary,
                },
              ]}
              onPress={handleAction}
              disabled={isPending || !!(isCollectAction && isCashUnpaid)}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text
                    style={[
                      styles.actionText,
                      isCollectAction &&
                        isCashUnpaid && { color: Colors.textSecondary },
                    ]}
                  >
                    {action.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Note when cash unpaid during collection */}
          {isCollectAction && isCashUnpaid && (
            <View style={styles.noteRow}>
              <Ionicons
                name="warning-outline"
                size={14}
                color="#F59E0B"
              />
              <Text style={styles.noteText}>
                Mark cash payment as paid before collecting order.
              </Text>
            </View>
          )}

          {/* Note when UPI is unverified during acceptance */}
          {isAcceptAction && isUpiUnverified && (
            <View style={styles.noteRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.noteTextSecondary}>
                {order.paymentVerificationStatus === 'pending'
                  ? 'Verify payment proof to accept order.'
                  : order.paymentVerificationStatus === 'rejected'
                  ? 'Payment proof rejected. Awaiting customer submission.'
                  : 'Awaiting payment proof from customer.'}
              </Text>
            </View>
          )}
        </OrderActionGroup>
      )}

      <PaymentProofViewerModal
        visible={isProofModalVisible}
        onClose={() => setIsProofModalVisible(false)}
        orderId={order.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexShrink: 1,
  },
  customerName: {
    fontFamily: Typography.family.bold,
    fontSize: 19,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  orderNumber: {
    fontFamily: Typography.family.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemsList: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  orderNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radii.sm,
  },
  orderNotesText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    borderRadius: Radii.md,
    minHeight: 44,
  },
  actionButtonPrimary: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonSecondary: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionButtonSuccess: {
    backgroundColor: '#10B981',
  },
  actionText: {
    fontFamily: Typography.family.bold,
    fontSize: 15,
    color: Colors.white,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  noteText: {
    fontFamily: Typography.family.medium,
    fontSize: 12,
    color: '#F59E0B',
  },
  noteTextSecondary: {
    fontFamily: Typography.family.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
