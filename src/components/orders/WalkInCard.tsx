import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { WalkInSale } from '@/src/types/models';

interface WalkInCardProps {
  walkIn: WalkInSale;
}

export const WalkInCard: React.FC<WalkInCardProps> = ({ walkIn }) => {
  const time = new Date(walkIn.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentColor = walkIn.paymentMethod === 'upi' ? Colors.info : Colors.accent;
  const paymentLabel = walkIn.paymentMethod === 'upi' ? 'UPI' : 'Cash';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.walkInLabel}>
            <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
            <Text style={styles.walkInTitle}>Walk-in Sale</Text>
          </View>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>COMPLETED</Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.timeText}>{time}</Text>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: paymentColor + '20', borderColor: paymentColor }]}>
            <Text style={[styles.paymentText, { color: paymentColor }]}>
              {paymentLabel} • Paid
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Meal Item */}
      <View style={styles.itemRow}>
        <Text style={styles.itemQuantity}>{walkIn.quantity}x</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{walkIn.mealName}</Text>
          <Text style={styles.unitPriceText}>₹{walkIn.unitPrice.toFixed(0)} each</Text>
        </View>
        <Text style={styles.totalPrice}>₹{walkIn.totalAmount.toFixed(0)}</Text>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Ionicons name="person-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.footerText}>{walkIn.operatorName}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="cash-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.footerAmountText}>₹{walkIn.totalAmount.toFixed(0)}</Text>
          </View>
        </View>
        {walkIn.note ? (
          <View style={styles.noteRow}>
            <Ionicons name="document-text-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.noteText}>{walkIn.note}</Text>
          </View>
        ) : null}
      </View>
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
    borderColor: Colors.accent + '30',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
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
  walkInLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  walkInTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.accent,
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: Colors.success + '20',
  },
  completedText: {
    fontFamily: Typography.family.bold,
    fontSize: 10,
    color: Colors.success,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  timeText: {
    fontFamily: Typography.family.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  paymentText: {
    fontFamily: Typography.family.bold,
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
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
  unitPriceText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  totalPrice: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  footer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
  },
  footerAmountText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.sm,
    color: Colors.accent,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  noteText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
