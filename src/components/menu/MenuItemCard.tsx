import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { MenuScheduleItem } from '@/src/types/models';

interface MenuItemCardProps {
  item: MenuScheduleItem;
  onRemove: (mealId: string) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onRemove }) => {
  const { meal } = item;

  if (!meal) return null;

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{meal.name}</Text>
          <Text style={styles.price}>₹{meal.price}</Text>
        </View>
        <Text style={styles.category}>{meal.category.toUpperCase()}</Text>
        <View style={styles.footer}>
          <View style={styles.spacer} />
          <TouchableOpacity 
            style={styles.removeBtn}
            onPress={() => onRemove(meal.id)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
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
});
