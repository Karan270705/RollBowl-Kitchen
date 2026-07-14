import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/src/lib/supabase';

import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { getKitchenDate, formatDisplayDate, formatDateKey } from '@/src/utils/helpers';
import { useCreateDraftBatch } from '@/src/hooks/useInventory';
import { getPrimaryStallId } from '@/src/services/menu';
import { fetchPublishedMenuMeals, formatLocalDate } from '@/src/services/inventory';

export default function CreateBatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [stallId, setStallId] = useState<string>();
  const [date, setDate] = useState<Date>(getKitchenDate());
  const [windowStart, setWindowStart] = useState<Date>(() => {
    const d = getKitchenDate();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [windowEnd, setWindowEnd] = useState<Date>(() => {
    const d = getKitchenDate();
    d.setHours(14, 0, 0, 0);
    return d;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [availableMeals, setAvailableMeals] = useState<any[]>([]);
  const [hasPublishedMenu, setHasPublishedMenu] = useState(true);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  
  // Selected items mapped by mealId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  const { mutateAsync: createDraft, isPending } = useCreateDraftBatch();

  useEffect(() => {
    getPrimaryStallId().then(id => {
      setStallId(id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (stallId) {
      fetchMeals(stallId, date);
    }
  }, [date, stallId]);

  const fetchMeals = async (sid: string, selectedDate: Date) => {
    setIsLoadingMeals(true);
    const { hasPublishedMenu: hasMenu, meals } = await fetchPublishedMenuMeals(sid, formatLocalDate(selectedDate));
    
    console.log('[Inventory] Published meals fetched', {
      stallId: sid,
      date: formatLocalDate(selectedDate),
      hasMenu,
      count: meals.length
    });
    
    setHasPublishedMenu(hasMenu);
    setAvailableMeals(meals);
    setIsLoadingMeals(false);
  };

  const handleSave = async () => {
    try {
      const itemsPayload = Object.entries(selectedItems)
        .filter(([_, qty]) => qty > 0)
        .map(([mealId, qty]) => ({ mealId, loadedQuantity: qty }));

      if (itemsPayload.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one meal with a quantity greater than 0.');
        return;
      }

      if (windowEnd <= windowStart) {
        Alert.alert('Validation Error', 'Window end time must be after the start time.');
        return;
      }

      const batchId = await createDraft({
        date,
        windowStart,
        windowEnd,
        items: itemsPayload,
        stallId,
      });

      router.replace(`/(app)/(inventory)/${batchId}`);
    } catch (error: any) {
      Alert.alert('Error Creating Draft', error.message);
    }
  };

  const updateQuantity = (mealId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[mealId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [mealId]: next };
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base, paddingBottom: insets.bottom || Spacing.base }]}>
      <View style={styles.header}>
        <Button variant="ghost" title="Back" onPress={() => router.back()} style={styles.backBtn} />
        <Text style={styles.screenTitle}>Create Draft Batch</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Window</Text>
          
          <Text style={styles.label}>Date</Text>
          <Button variant="outline" title={formatDisplayDate(date)} onPress={() => setShowDatePicker(true)} style={styles.pickerBtn} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.xs }}>
              <Text style={styles.label}>Start Time</Text>
              <Button variant="outline" title={windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} onPress={() => setShowStartPicker(true)} style={styles.pickerBtn} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.xs }}>
              <Text style={styles.label}>End Time</Text>
              <Button variant="outline" title={windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} onPress={() => setShowEndPicker(true)} style={styles.pickerBtn} />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Initial Loaded Items</Text>
          {isLoadingMeals ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : !hasPublishedMenu ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No menu has been published for this date. Publish the menu before creating inventory.</Text>
            </View>
          ) : availableMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>The published menu contains no available items.</Text>
            </View>
          ) : (
            availableMeals.map(meal => {
              const qty = selectedItems[meal.id] || 0;
              return (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealCategory}>{meal.category}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <Button variant="outline" title="-" onPress={() => updateQuantity(meal.id, -1)} disabled={qty === 0} style={styles.stepBtn as any} />
                    <Text style={styles.qtyText}>{qty}</Text>
                    <Button variant="outline" title="+" onPress={() => updateQuantity(meal.id, 1)} style={styles.stepBtn as any} />
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={isPending ? "Creating..." : "Save Draft"} 
          onPress={handleSave} 
          disabled={isPending || isLoadingMeals || !hasPublishedMenu || availableMeals.length === 0}
          fullWidth
        />
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date} mode="date" display="default"
          onChange={(e, d) => { setShowDatePicker(false); if(d) { setDate(d); setSelectedItems({}); } }}
        />
      )}
      {showStartPicker && (
        <DateTimePicker
          value={windowStart} mode="time" display="default"
          onChange={(e, d) => { setShowStartPicker(false); if(d) { const nd = new Date(windowStart); nd.setHours(d.getHours(), d.getMinutes()); setWindowStart(nd); } }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={windowEnd} mode="time" display="default"
          onChange={(e, d) => { setShowEndPicker(false); if(d) { const nd = new Date(windowEnd); nd.setHours(d.getHours(), d.getMinutes()); setWindowEnd(nd); } }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, marginBottom: Spacing.base },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.xs },
  screenTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['4xl'] },
  section: { marginBottom: Spacing.lg, padding: Spacing.base },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, marginBottom: Spacing.base },
  label: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', marginTop: Spacing.base },
  pickerBtn: { justifyContent: 'flex-start' },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealInfo: { flex: 1 },
  mealName: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.base, color: Colors.textPrimary },
  mealCategory: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textTertiary, textTransform: 'capitalize' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: { width: 36, height: 36, paddingHorizontal: 0, paddingVertical: 0 },
  qtyText: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.border },
  emptyState: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontFamily: Typography.family.medium, fontSize: Typography.size.base, color: Colors.textSecondary, textAlign: 'center', fontStyle: 'italic' }
});
