import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useStallContext } from '@/src/contexts/StallContext';
import {
  fetchAllStalls,
  createStall,
  updateStall,
  deactivateStall,
  activateStall,
  type CreateStallParams,
  type Stall,
} from '@/src/services/stalls';

export default function StallsManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refetch: refetchStallContext } = useStallContext();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [formData, setFormData] = useState<CreateStallParams>({
    name: '',
    location: '',
    address: '',
    phone: '',
    description: '',
  });

  const { data: stalls = [], isLoading } = useQuery({
    queryKey: ['stalls'],
    queryFn: fetchAllStalls,
  });

  const createMutation = useMutation({
    mutationFn: createStall,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      await refetchStallContext();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Stall created successfully');
    },
    onError: (error: any) => Alert.alert('Error', error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: Partial<CreateStallParams> }) =>
      updateStall(id, params),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      await refetchStallContext();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Stall updated successfully');
    },
    onError: (error: any) => Alert.alert('Error', error.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateStall,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      await refetchStallContext();
      Alert.alert('Success', 'Stall deactivated');
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateStall,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      await refetchStallContext();
      Alert.alert('Success', 'Stall activated');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', location: '', address: '', phone: '', description: '' });
    setEditingStall(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (stall: Stall) => {
    setEditingStall(stall);
    setFormData({
      name: stall.name,
      location: stall.location || '',
      address: stall.address || '',
      phone: stall.phone || '',
      description: stall.description || '',
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Stall name is required');
      return;
    }
    if (editingStall) {
      updateMutation.mutate({ id: editingStall.id, params: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (stall: Stall) => {
    Alert.alert(
      stall.is_active ? 'Deactivate Stall' : 'Activate Stall',
      `Are you sure you want to ${stall.is_active ? 'deactivate' : 'activate'} "${stall.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: stall.is_active ? 'Deactivate' : 'Activate',
          style: stall.is_active ? 'destructive' : 'default',
          onPress: () => {
            if (stall.is_active) {
              deactivateMutation.mutate(stall.id);
            } else {
              activateMutation.mutate(stall.id);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Stalls</Text>
        <TouchableOpacity onPress={handleCreateNew} style={styles.iconBtn}>
          <Ionicons name="add" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing['3xl'] }} />
      ) : stalls.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Stalls Yet</Text>
          <Text style={styles.emptyDesc}>Tap the + button to create your first stall.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {stalls.map((stall: Stall) => (
            <Card key={stall.id} style={styles.stallCard}>
              <View style={styles.stallHeader}>
                <View style={styles.stallInfo}>
                  <Text style={styles.stallName}>{stall.name}</Text>
                  {stall.location ? (
                    <Text style={styles.stallLocation}>?? {stall.location}</Text>
                  ) : null}
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: stall.is_active ? Colors.success + '20' : Colors.error + '20' },
                ]}>
                  <Text style={[styles.statusText, { color: stall.is_active ? Colors.success : Colors.error }]}>
                    {stall.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {stall.address ? <Text style={styles.stallDetail}>?? {stall.address}</Text> : null}
              {stall.phone ? <Text style={styles.stallDetail}>?? {stall.phone}</Text> : null}
              {stall.description ? <Text style={styles.stallDescription}>{stall.description}</Text> : null}

              <View style={styles.stallActions}>
                <Button
                  title="Edit"
                  variant="outline"
                  onPress={() => handleEdit(stall)}
                  style={{ flex: 1, marginRight: Spacing.xs }}
                />
                <Button
                  title={stall.is_active ? 'Deactivate' : 'Activate'}
                  variant={stall.is_active ? 'danger' : 'primary'}
                  onPress={() => handleToggleActive(stall)}
                  style={{ flex: 1, marginLeft: Spacing.xs }}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStall ? 'Edit Stall' : 'Create New Stall'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Stall Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="e.g., Main Kitchen, South Campus"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
                placeholder="e.g., Building A, Block 2"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
                placeholder="Full address"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                placeholder="Contact number"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
                placeholder="Additional details"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => { setModalVisible(false); resetForm(); }}
                style={{ flex: 1, marginRight: Spacing.xs }}
              />
              <Button
                title={createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ flex: 1, marginLeft: Spacing.xs }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: { padding: Spacing.xs },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  content: { padding: Spacing.base },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['4xl'],
  },
  emptyTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  emptyDesc: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  stallCard: { marginBottom: Spacing.base },
  stallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  stallInfo: { flex: 1, marginRight: Spacing.sm },
  stallName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stallLocation: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
  },
  stallDetail: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  stallDescription: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginVertical: Spacing.xs,
  },
  stallActions: { flexDirection: 'row', marginTop: Spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  modalBody: { padding: Spacing.base },
  label: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
