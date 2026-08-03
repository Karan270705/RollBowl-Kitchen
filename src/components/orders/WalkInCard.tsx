import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { WalkInSale } from '@/src/types/models';
import {
  OrderStatusBadge,
  OrderInfoGrid,
  OrderItemRow,
} from './OrderPrimitives';

interface WalkInCardProps {
  walkIn: WalkInSale;
}

export const WalkInCard: React.FC<WalkInCardProps> = ({ walkIn }) => {
  const time = new Date(walkIn.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isUpi = walkIn.paymentMethod === 'upi';
  const paymentLabel = isUpi ? 'UPI • Paid' : 'Cash • Paid';
  const paymentColor = isUpi ? '#8B5CF6' : '#F59E0B';

  return (
    <View style={styles.card}>
      {/* Section A: Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Ionicons name="people-outline" size={18} color="#06B6D4" />
            <Text style={styles.title} numberOfLines={1}>
              Walk-in Sale
            </Text>
          </View>
          <Text style={styles.subtitle}>
            Operator: {walkIn.operatorName || 'Staff'} • {time}
          </Text>
        </View>
        <OrderStatusBadge status="completed" />
      </View>

      {/* Section B: Important Operational Information */}
      <OrderInfoGrid
        orderTypeLabel="Walk-in Sale"
        orderTypeColor="#06B6D4"
        pickupSlot="Immediate"
        paymentStateLabel={paymentLabel}
        paymentStateColor={paymentColor}
      />

      {/* Section C: Item & Price */}
      <View style={styles.itemsList}>
        <OrderItemRow
          quantity={walkIn.quantity}
          mealName={walkIn.mealName}
          specialInstructions={`₹${walkIn.unitPrice.toFixed(0)} each • Total ₹${walkIn.totalAmount.toFixed(0)}`}
        />
      </View>

      {/* Section D: Note if present */}
      {walkIn.note ? (
        <View style={styles.noteBox}>
          <Ionicons
            name="document-text-outline"
            size={14}
            color={Colors.textTertiary}
          />
          <Text style={styles.noteText}>{walkIn.note}</Text>
        </View>
      ) : null}
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
    borderColor: 'rgba(6, 182, 212, 0.3)',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  subtitle: {
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
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radii.sm,
  },
  noteText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
