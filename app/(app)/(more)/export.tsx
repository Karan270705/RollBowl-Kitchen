import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useExportOrders } from '@/src/hooks/useExportOrders';
import { getKitchenDate, formatDateKey, formatDisplayDate } from '@/src/utils/helpers';
import { Stack } from 'expo-router';

export default function ExportOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isExporting, progress, exportXlsx, exportCsv } = useExportOrders();
  
  // Use kitchen date by default
  const today = getKitchenDate();
  const [fromDate, setFromDate] = useState<Date>(today);
  const [toDate, setToDate] = useState<Date>(today);
  
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const validateRange = (): boolean => {
    if (fromDate > toDate) {
      Alert.alert('Invalid Range', 'From Date cannot be later than To Date.');
      return false;
    }
    
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      Alert.alert('Range Too Large', 'Please select a date range of 90 days or less.');
      return false;
    }
    return true;
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!validateRange()) return;
    
    const fromStr = formatDateKey(fromDate);
    const toStr = formatDateKey(toDate);
    
    try {
      if (format === 'xlsx') await exportXlsx(fromStr, toStr);
      else await exportCsv(fromStr, toStr);
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    }
  };

  const renderDatePicker = (
    value: Date, 
    onChange: (event: any, date?: Date) => void, 
    show: boolean, 
    setShow: (v: boolean) => void
  ) => {
    if (Platform.OS === 'ios') {
      return (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) onChange(event, selectedDate);
          }}
          themeVariant="dark"
        />
      );
    }
    return show ? (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShow(false);
          if (selectedDate) onChange(event, selectedDate);
        }}
      />
    ) : null;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ title: 'Export Orders', headerTitleStyle: { color: Colors.textPrimary } }} />
      
      <Card style={styles.card}>
        <Text style={styles.description}>
          Select a pickup date range to export operations data. The maximum allowed range is 90 days.
        </Text>
        
        <View style={styles.pickerSection}>
          <Text style={styles.label}>From Date</Text>
          {Platform.OS === 'android' ? (
            <Button 
              title={formatDisplayDate(fromDate)} 
              variant="outline" 
              onPress={() => setShowFromPicker(true)} 
              disabled={isExporting}
            />
          ) : null}
          {renderDatePicker(fromDate, (_, date) => date && setFromDate(date), showFromPicker, setShowFromPicker)}
        </View>

        <View style={styles.pickerSection}>
          <Text style={styles.label}>To Date</Text>
          {Platform.OS === 'android' ? (
            <Button 
              title={formatDisplayDate(toDate)} 
              variant="outline" 
              onPress={() => setShowToPicker(true)} 
              disabled={isExporting}
            />
          ) : null}
          {renderDatePicker(toDate, (_, date) => date && setToDate(date), showToPicker, setShowToPicker)}
        </View>
      </Card>

      <Card style={styles.card}>
        {isExporting ? (
          <View style={styles.progressContainer}>
            <Ionicons name="sync" size={24} color={Colors.primary} style={styles.spinner} />
            <Text style={styles.progressText}>{progress?.stage || 'Processing...'}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              title="Export Excel (.xlsx)"
              onPress={() => handleExport('xlsx')}
              disabled={isExporting}
              style={styles.actionButton}
            />
            <Button
              title="Export CSV (.csv)"
              variant="outline"
              onPress={() => handleExport('csv')}
              disabled={isExporting}
              style={styles.actionButton}
            />
          </View>
        )}
      </Card>

      <View style={styles.warningContainer}>
        <Ionicons name="lock-closed" size={16} color={Colors.textTertiary} />
        <Text style={styles.warningText}>
          This report contains customer information. Share it only with authorized staff.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
  },
  card: {
    marginBottom: Spacing.base,
  },
  description: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },
  pickerSection: {
    marginBottom: Spacing.base,
  },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actions: {
    gap: Spacing.sm,
  },
  actionButton: {
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  spinner: {
    marginBottom: Spacing.base,
  },
  progressText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
    color: Colors.primary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radii.lg,
    marginTop: 'auto',
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});
