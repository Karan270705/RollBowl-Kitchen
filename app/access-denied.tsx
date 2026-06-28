import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { signOut } from '@/src/services/auth';
import { useAuthStore, useUser } from '@/src/store';

export default function AccessDeniedScreen() {
  const router = useRouter();
  const user = useUser();
  const authLogout = useAuthStore((s) => s.logout);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Ignore sign-out errors
    } finally {
      authLogout();
      router.replace('/(auth)/login' as any);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.errorMuted, Colors.transparent]}
        style={styles.glow}
      />

      {/* Lock Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconRing}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
        </View>
      </View>

      {/* Message */}
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>Staff Only Area</Text>

      <View style={styles.messageBox}>
        <Ionicons
          name="information-circle"
          size={18}
          color={Colors.textSecondary}
        />
        <Text style={styles.messageText}>
          This app is for kitchen staff and operators only. Customer accounts
          cannot access the Kitchen portal.
        </Text>
      </View>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Signed in as</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
        />
      </View>
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
  glow: {
    position: 'absolute',
    top: '20%',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },
  iconContainer: {
    marginBottom: Spacing['2xl'],
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.errorMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.error,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
    color: Colors.error,
    marginBottom: Spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  messageText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: Typography.lineHeight.base,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  userLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: Colors.errorMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  roleText: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.xs,
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actions: {
    width: '100%',
    maxWidth: 300,
  },
});
