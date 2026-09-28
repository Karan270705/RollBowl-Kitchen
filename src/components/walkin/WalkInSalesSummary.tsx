import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useWalkInSalesSummary } from '@/src/hooks/useWalkInOrders';

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ─── Props ────────────────────────────────────────────────────

export interface WalkInSalesSummaryProps {
  stallId: string;
  operationalDate: string;
  onPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────

export function WalkInSalesSummary({
  stallId,
  operationalDate,
  onPress,
}: WalkInSalesSummaryProps) {
  const { data: summary, isLoading } = useWalkInSalesSummary(stallId, operationalDate);

  const count   = summary?.count   ?? 0;
  const revenue = summary?.revenue ?? 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      <LinearGradient
        colors={[Colors.surfaceElevated, Colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Red accent bar — matches StatCard pattern */}
        <View style={styles.accentBar} />

        <View style={styles.body}>
          {/* Icon + label row */}
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.labelGroup}>
              <Text style={styles.cardTitle}>Walk-In Sales</Text>
              <Text style={styles.cardSubtitle}>Direct counter orders today</Text>
            </View>
            {onPress && (
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            )}
          </View>

          {/* Stat row */}
          {isLoading ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{count}</Text>
                <Text style={styles.statLabel}>ORDERS</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatCurrency(revenue)}</Text>
                <Text style={styles.statLabel}>REVENUE</Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  gradient: {
    borderRadius: Radii.lg,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
  },
  body: {
    padding: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  labelGroup: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  loadingText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    letterSpacing: 0.6,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
  },
});
