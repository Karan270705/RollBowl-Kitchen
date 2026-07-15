import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { MenuScheduleItem } from '@/src/types/models';

interface MenuItemCardProps {
  item: MenuScheduleItem;
  onRemove: (mealId: string) => void;
  onEnable?: (mealId: string) => void;
  isLocked?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onRemove, onEnable, isLocked = false }) => {
  const { meal } = item;

  if (!meal) return null;

  const isUnavailable = !meal.isAvailable;

  return (
    <View style={[styles.card, isUnavailable && styles.cardUnavailable]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, isUnavailable && styles.textDimmed]}>{meal.name}</Text>
          <View style={styles.rightHeader}>
            {isUnavailable && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableBadgeText}>UNAVAILABLE</Text>
              </View>
            )}
            <Text style={[styles.price, isUnavailable && styles.textDimmed]}>₹{meal.price}</Text>
          </View>
        </View>
        <Text style={[styles.category, isUnavailable && styles.textDimmed]}>{meal.category.toUpperCase()}</Text>
        {(!isLocked || isUnavailable) && (
          <View style={styles.footer}>
            {isUnavailable && onEnable && (
              <TouchableOpacity 
                style={styles.enableBtn}
                onPress={() => onEnable(meal.id)}
              >
                <Text style={styles.enableText}>Enable Meal</Text>
              </TouchableOpacity>
            )}
            <View style={styles.spacer} />
            {!isLocked && (
              <TouchableOpacity 
                style={styles.removeBtn}
                onPress={() => onRemove(meal.id)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  price: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.accent,
  },
  category: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  spacer: {
    flex: 1,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.errorMuted,
  },
  removeText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.error,
  },
  cardUnavailable: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    opacity: 0.8,
  },
  textDimmed: {
    color: Colors.textSecondary,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  unavailableBadge: {
    backgroundColor: Colors.errorMuted,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  unavailableBadgeText: {
    color: Colors.error,
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  enableBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primaryMuted,
  },
  enableText: {
    color: Colors.primary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
  }
});
