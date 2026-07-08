import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Order, OrderItem } from '@/src/types/models';
import { useUpdateOrderStatus } from '@/src/hooks/useOrders';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();

  // Status flow: pending → confirmed (Accepted) → ready → picked_up
  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return { label: 'Accept Order', nextStatus: 'confirmed' as const, color: Colors.info };
      case 'confirmed':
      case 'preparing': // Fallback for any legacy orders
        return { label: 'Mark Ready', nextStatus: 'ready' as const, color: Colors.warning };
      case 'ready':
        return { label: 'Mark Collected', nextStatus: 'picked_up' as const, color: Colors.success };
      default:
        return null;
    }
  };

  const action = getNextAction();

  const handleAction = () => {
    if (action) {
      updateStatus({ orderId: order.id, status: action.nextStatus });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.textTertiary;
      case 'confirmed':
      case 'preparing': return Colors.info;
      case 'ready': return Colors.warning;
      case 'picked_up':
      case 'delivered': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status === 'confirmed' ? 'ACCEPTED' : order.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          {order.orderType === 'subscription' && (
            <View style={styles.subBadge}>
              <Ionicons name="calendar-outline" size={12} color={Colors.primary} />
              <Text style={styles.subText}>SUBSCRIPTION</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.itemsList}>
        {order.items?.map((item: OrderItem) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemQuantity}>{item.quantity}x</Text>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.mealName}</Text>
              {item.specialInstructions && (
                <Text style={styles.itemNotes}>Note: {item.specialInstructions}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {order.notes && (
        <View style={styles.orderNotes}>
          <Ionicons name="document-text-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.orderNotesText}>{order.notes}</Text>
        </View>
      )}

      {action && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: action.color }]}
            onPress={handleAction}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Text style={styles.actionText}>{action.label}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderNumber: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontFamily: Typography.family.bold,
    fontSize: 10,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  subText: {
    fontFamily: Typography.family.bold,
    fontSize: 10,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  itemsList: {
    gap: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  itemQuantity: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    width: 24,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  itemNotes: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.warning,
    marginTop: 2,
  },
  orderNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderNotesText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: Spacing.base,
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.background,
  },
});
