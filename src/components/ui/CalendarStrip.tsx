import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { getKitchenDate } from '@/src/utils/helpers';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  daysAhead?: number;
}

const getDates = (daysAhead: number) => {
  const dates = [];
  const today = getKitchenDate();
  
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  daysAhead = 14,
}) => {
  const dates = useMemo(() => getDates(daysAhead), [daysAhead]);

  const renderDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const isSelected = selectedDate === dateString;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();

    return (
      <TouchableOpacity
        key={dateString}
        onPress={() => onSelectDate(dateString)}
        style={[styles.dateContainer, isSelected && styles.selectedContainer]}
      >
        <Text style={[styles.dayName, isSelected && styles.selectedText]}>
          {dayName}
        </Text>
        <Text style={[styles.dayNumber, isSelected && styles.selectedText]}>
          {dayNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map(renderDate)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    backgroundColor: Colors.surfaceHighlight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateContainer: {
    width: 56,
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedContainer: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayName: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  selectedText: {
    color: '#FFFFFF',
  },
});
