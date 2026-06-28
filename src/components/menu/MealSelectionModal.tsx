import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Meal } from '@/src/types/models';
import { Button } from '@/src/components/ui/Button';

interface MealSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (selectedMealIds: string[]) => void;
  availableMeals: Meal[];
  initialSelectedIds: string[];
}

export const MealSelectionModal: React.FC<MealSelectionModalProps> = ({
  visible,
  onClose,
  onSave,
  availableMeals,
  initialSelectedIds,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set(initialSelectedIds));
    }
  }, [visible, initialSelectedIds]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Meals</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {availableMeals.map((meal) => {
            const isSelected = selectedIds.has(meal.id);
            return (
              <TouchableOpacity
                key={meal.id}
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => toggleSelection(meal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{meal.name}</Text>
                  <Text style={styles.itemCategory}>{meal.category.toUpperCase()}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
          {availableMeals.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No meals found in catalog.</Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button 
            title={`Add ${selectedIds.size} Meal${selectedIds.size !== 1 ? 's' : ''}`}
            onPress={handleSave} 
            fullWidth 
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  saveBtn: {
    padding: Spacing.xs,
  },
  saveText: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.base,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemCategory: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: Typography.family.regular,
  },
  footer: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
