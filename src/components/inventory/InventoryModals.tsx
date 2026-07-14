import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Alert } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useActivateBatch, useCloseBatch, useCancelBatch, useRecordMovement } from '@/src/hooks/useInventory';
import { useRouter } from 'expo-router';

export const ActivationModal = ({ visible, onClose, batchId, items, windowStr, dateStr }: any) => {
  const { mutateAsync: activate, isPending } = useActivateBatch();
  const router = useRouter();

  const handleActivate = async () => {
    try {
      await activate(batchId);
      Alert.alert('Success', 'Batch activated successfully.');
      onClose();
    } catch (e: any) {
      Alert.alert('Activation Failed', e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Activation</Text>
          <Text style={styles.modalSubTitle}>{dateStr} | {windowStr}</Text>
          <Text style={styles.warningText}>
            ⚠️ WARNING: Activating this batch will make stock immediately visible to customers on the Customer App. Loaded quantities cannot be changed after activation.
          </Text>
          
          <Text style={styles.sectionTitle}>Loaded Items:</Text>
          {items?.map((i: any) => (
            <View key={i.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{i.meals?.name}</Text>
              <Text style={styles.itemQty}>{i.loaded_quantity}</Text>
            </View>
          ))}

          <View style={styles.actionRow}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flexBtn} />
            <Button title={isPending ? "Activating..." : "Activate Now"} onPress={handleActivate} disabled={isPending} style={styles.flexBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const CloseModal = ({ visible, onClose, batchId }: any) => {
  const { mutateAsync: close, isPending } = useCloseBatch();
  const [note, setNote] = useState('');

  const handleClose = async () => {
    try {
      await close({ batchId, note });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Close Batch</Text>
          <Text style={styles.descText}>Closing this batch will freeze stock and prevent further modifications or customer orders.</Text>
          <Input label="Optional Note" placeholder="Optional Note" value={note} onChangeText={setNote} style={{ marginBottom: Spacing.lg }} />
          <View style={styles.actionRow}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flexBtn} />
            <Button title={isPending ? "Closing..." : "Confirm Close"} onPress={handleClose} disabled={isPending} style={styles.flexBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const CancelModal = ({ visible, onClose, batchId }: any) => {
  const { mutateAsync: cancel, isPending } = useCancelBatch();
  const [note, setNote] = useState('');

  const handleCancel = async () => {
    if (!note.trim()) {
      Alert.alert('Validation Error', 'A reason is required to cancel.');
      return;
    }
    try {
      await cancel({ batchId, note });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cancel Batch</Text>
          <Text style={styles.descText}>Cancelling will revoke all available stock. Provide a reason.</Text>
          <Input label="Reason (Required)" placeholder="Reason (Required)" value={note} onChangeText={setNote} style={{ marginBottom: Spacing.lg }} />
          <View style={styles.actionRow}>
            <Button title="Back" variant="outline" onPress={onClose} style={styles.flexBtn} />
            <Button title={isPending ? "Cancelling..." : "Confirm Cancel"} onPress={handleCancel} disabled={isPending || !note.trim()} style={[styles.flexBtn, { backgroundColor: Colors.error }] as any} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const MovementModal = ({ visible, onClose, batchId, item, mode }: any) => {
  const { mutateAsync: recordMovement, isPending } = useRecordMovement();
  const [type, setType] = useState('walk_in_sale');
  const [qtyStr, setQtyStr] = useState('1');
  const [note, setNote] = useState('');

  // Keep type synchronized when mode changes
  useEffect(() => {
    if (visible) {
      setType(mode === 'add' ? 'stock_added' : 'walk_in_sale');
      setQtyStr('1');
      setNote('');
    }
  }, [visible, mode]);

  if (!item) return null;

  // Protect reserved app orders for all normal manual outflows
  const maxAllowed = mode === 'remove' ? item.extra_available : null;

  const handleRecord = async () => {
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Quantity must be a positive integer.');
      return;
    }
    if (maxAllowed !== null && qty > maxAllowed) {
      Alert.alert('Error', `Cannot exceed ${maxAllowed} (reserved orders must be protected).`);
      return;
    }

    try {
      await recordMovement({ batchItemId: item.inventory_batch_item_id, type, quantity: qty, note, batchId });
      Alert.alert('Success', 'Movement recorded.');
      onClose();
    } catch (e: any) {
      Alert.alert('Movement Failed', e.message);
    }
  };

  const movementOptions = mode === 'add' 
    ? ['stock_added', 'correction_increase'] 
    : ['walk_in_sale', 'damaged', 'wasted', 'complimentary', 'correction_decrease'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{mode === 'add' ? 'Add Stock' : 'Remove Stock'}</Text>
          <Text style={styles.modalSubTitle}>{item.item_name}</Text>

          <View style={styles.typeSelector}>
             {movementOptions.map(t => (
               <Button 
                 key={t} 
                 title={t.replace(/_/g, ' ')} 
                 variant={type === t ? 'primary' : 'outline'} 
                 onPress={() => setType(t)} 
                 style={{ marginBottom: Spacing.xs }}
               />
             ))}
             {mode === 'remove' && (
               <Button
                 title="Subscription walk-in redemption — coming soon"
                 variant="outline"
                 disabled
                 style={{ marginBottom: Spacing.xs, opacity: 0.5, borderColor: Colors.border }}
                 textStyle={{ color: Colors.textTertiary }}
                 onPress={() => {}}
               />
             )}
          </View>

          <Input 
            label="Quantity"
            placeholder="Quantity" 
            value={qtyStr} 
            onChangeText={setQtyStr} 
            keyboardType="numeric" 
            style={{ marginBottom: Spacing.sm }} 
          />
          {maxAllowed !== null && (
            <Text style={styles.hintText}>Max Allowed (Available): {maxAllowed}</Text>
          )}

          <Input 
            label="Optional Note"
            placeholder="Optional Note" 
            value={note} 
            onChangeText={setNote} 
            style={{ marginBottom: Spacing.lg }} 
          />

          <View style={styles.actionRow}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flexBtn} />
            <Button title={isPending ? "Recording..." : "Record"} onPress={handleRecord} disabled={isPending} style={styles.flexBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.base },
  modalContent: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: Radii.md },
  modalTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, marginBottom: Spacing.xs, color: Colors.textPrimary },
  modalSubTitle: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.base, marginBottom: Spacing.lg, color: Colors.textSecondary },
  descText: { fontFamily: Typography.family.regular, fontSize: Typography.size.base, marginBottom: Spacing.lg, color: Colors.textSecondary },
  warningText: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.sm, color: Colors.error, marginBottom: Spacing.lg, backgroundColor: Colors.error + '1A', padding: Spacing.sm, borderRadius: Radii.sm },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.base, marginBottom: Spacing.sm, color: Colors.textPrimary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderColor: Colors.border },
  itemName: { fontFamily: Typography.family.regular, fontSize: Typography.size.base, color: Colors.textPrimary },
  itemQty: { fontFamily: Typography.family.bold, fontSize: Typography.size.base, color: Colors.textPrimary },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  flexBtn: { flex: 1 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
  hintText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textTertiary, marginBottom: Spacing.sm }
});
