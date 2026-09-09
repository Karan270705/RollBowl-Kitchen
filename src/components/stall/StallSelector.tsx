import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useStallContext } from '@/src/contexts/StallContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const StallSelector = () => {
  const { currentStallId, currentStallName, assignments, switchStall } = useStallContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const insets = useSafeAreaInsets();

  // If only 1 assigned stall, don't show the selector UI, just a static label
  if (assignments.length <= 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.singleStallText}>{currentStallName}</Text>
      </View>
    );
  }

  const handleSelect = async (stallId: string) => {
    if (stallId === currentStallId) {
      setIsOpen(false);
      return;
    }
    
    setIsSwitching(true);
    try {
      await switchStall(stallId);
    } catch (err) {
      console.error('Failed to switch stall', err);
    } finally {
      setIsSwitching(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.stallText} numberOfLines={1}>{currentStallName}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textPrimary} style={styles.icon} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Stall</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
              {assignments.map((assignment) => {
                const isActive = assignment.stall_id === currentStallId;
                const stallName = assignment.stalls?.name || 'Unknown Stall';
                
                return (
                  <TouchableOpacity
                    key={assignment.stall_id}
                    style={[styles.stallItem, isActive && styles.stallItemActive]}
                    onPress={() => handleSelect(assignment.stall_id)}
                    disabled={isSwitching}
                  >
                    <View style={styles.stallItemIcon}>
                      <Ionicons 
                        name={isActive ? "radio-button-on" : "radio-button-off"} 
                        size={24} 
                        color={isActive ? Colors.primary : Colors.border} 
                      />
                    </View>
                    <View style={styles.stallItemContent}>
                      <Text style={[styles.stallItemName, isActive && styles.stallItemNameActive]}>
                        {stallName}
                      </Text>
                      <Text style={styles.stallItemRole}>
                        Role: {assignment.role.replace('_', ' ')}
                      </Text>
                    </View>
                    {isSwitching && isActive && (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stallText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    maxWidth: 150,
  },
  singleStallText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  icon: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    ...Shadows.md,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  stallItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stallItemActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  stallItemIcon: {
    marginRight: Spacing.md,
  },
  stallItemContent: {
    flex: 1,
  },
  stallItemName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  stallItemNameActive: {
    color: Colors.primary,
  },
  stallItemRole: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
});
