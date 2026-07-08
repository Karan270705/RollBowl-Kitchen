import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/src/components/ui/Button';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useHolidays, useAddHoliday, useUpdateHolidayStatus } from '@/src/hooks/useHolidays';
import { KitchenHoliday } from '@/src/types/models';
import { getKitchenDate, formatDateKey, formatDisplayDate } from '@/src/utils/helpers';

export default function HolidaysScreen() {
  const { data: holidays = [], isLoading } = useHolidays();
  const { mutate: addHoliday, isPending: isAdding } = useAddHoliday();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateHolidayStatus();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [date, setDate] = useState(getKitchenDate());
  const [showPicker, setShowPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const todayStr = formatDateKey(getKitchenDate());

  const sections = useMemo(() => {
    const upcoming = holidays.filter(h => h.holidayDate >= todayStr);
    const past = holidays.filter(h => h.holidayDate < todayStr);

    const data = [];
    if (upcoming.length > 0) data.push({ title: 'Upcoming Holidays', data: upcoming, isPastSection: false });
    if (past.length > 0) data.push({ title: 'Past Holidays (Historical)', data: past, isPastSection: true });
    return data;
  }, [holidays, todayStr]);

  const handleAddHoliday = () => {
    if (!title) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }

    addHoliday({
      holidayDate: formatDateKey(date),
      title,
      description: description.trim() || undefined,
    }, {
      onSuccess: () => {
        setModalVisible(false);
        setDate(getKitchenDate());
        setTitle('');
        setDescription('');
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to add holiday.');
      }
    });
  };

  const handleToggleStatus = (holiday: KitchenHoliday) => {
    const action = holiday.isActive ? 'disable' : 'enable';
    Alert.alert(
      `Confirm ${action === 'disable' ? 'Disable' : 'Enable'}`,
      `Are you sure you want to ${action} this holiday? This will automatically update affected subscriptions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => updateStatus({ id: holiday.id, isActive: !holiday.isActive })
        }
      ]
    );
  };

  const renderHoliday = ({ item, section }: { item: KitchenHoliday, section: any }) => {
    const isPast = section.isPastSection;
    const isMuted = isPast || !item.isActive;

    return (
      <View style={[styles.card, isMuted && styles.cardDisabled]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardDate, isMuted && styles.textDisabled]}>
            {formatDisplayDate(new Date(item.holidayDate))}
          </Text>
          
          {!isPast && (
            <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusText, item.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                {item.isActive ? 'ACTIVE' : 'DISABLED'}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.cardTitle, isMuted && styles.textDisabled]}>{item.title}</Text>
        {item.description ? (
          <Text style={[styles.cardDesc, isMuted && styles.textDisabled]}>{item.description}</Text>
        ) : null}

        {!isPast && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleToggleStatus(item)}
              disabled={isUpdating}
            >
              <Ionicons 
                name={item.isActive ? "close-circle-outline" : "checkmark-circle-outline"} 
                size={18} 
                color={item.isActive ? Colors.error : Colors.success} 
              />
              <Text style={[styles.actionText, { color: item.isActive ? Colors.error : Colors.success }]}>
                {item.isActive ? 'Disable Holiday' : 'Enable Holiday'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Manage Holidays' }} />
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderHoliday}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.borderLight} />
              <Text style={styles.emptyText}>No holidays configured.</Text>
            </View>
          }
        />
      )}

      <View style={styles.fabContainer}>
        <Button 
          title="Add Holiday"
          onPress={() => setModalVisible(true)}
          fullWidth
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Kitchen Holiday</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Date</Text>
              {Platform.OS === 'android' ? (
                <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
                  <Text style={{ color: Colors.textPrimary, fontFamily: Typography.family.medium }}>
                    {formatDisplayDate(date)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginBottom: Spacing.base, alignSelf: 'flex-start' }}>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={getKitchenDate()}
                    onChange={(event, selectedDate) => {
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                </View>
              )}

              {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  minimumDate={getKitchenDate()}
                  onChange={(event, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Republic Day"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Kitchen closed due to national holiday."
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />

              <Button 
                title="Save Holiday"
                onPress={handleAddHoliday}
                loading={isAdding}
                style={{ marginTop: Spacing.base }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.base,
    color: Colors.textSecondary,
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    ...Shadows.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardDisabled: {
    backgroundColor: Colors.background,
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cardDate: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.primary,
  },
  cardTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  textDisabled: {
    color: Colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  statusActive: {
    backgroundColor: Colors.success + '20',
  },
  statusInactive: {
    backgroundColor: Colors.borderLight,
  },
  statusText: {
    fontFamily: Typography.family.bold,
    fontSize: 10,
  },
  statusTextActive: {
    color: Colors.success,
  },
  statusTextInactive: {
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: Spacing.xs,
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  form: {
    flex: 1,
  },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radii.md,
    padding: Spacing.base,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
