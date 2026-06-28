import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="compass-outline" size={64} color={Colors.textTertiary} />
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.subtitle}>
        The screen you're looking for doesn't exist.
      </Text>
      <Button
        title="Go to Dashboard"
        onPress={() => router.replace('/(app)/(dashboard)' as any)}
        variant="outline"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  button: {
    minWidth: 200,
  },
});
