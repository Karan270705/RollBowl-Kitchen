import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { signOut } from '@/src/services/auth';
import { useAuthStore, useUser } from '@/src/store';
import { AppConfig } from '@/src/constants/config';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const authLogout = useAuthStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // Ignore sign-out errors
    } finally {
      authLogout();
      router.replace('/(auth)/login' as any);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base }]}>
      <Text style={styles.screenTitle}>More</Text>

      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Staff'}</Text>
            <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.accent} />
              <Text style={styles.roleText}>
                {user?.role === 'stall_operator' ? 'Operator' : 'Kitchen Staff'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* App Info */}
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App</Text>
          <Text style={styles.infoValue}>{AppConfig.APP_NAME}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{AppConfig.APP_VERSION}</Text>
        </View>
      </Card>

      {/* Admin Features */}
      <Card style={styles.infoCard}>
        <TouchableOpacity 
          style={styles.infoRow}
          onPress={() => router.push('/(app)/(more)/holidays')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.infoLabel}>Manage Holidays</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
        </TouchableOpacity>
      </Card>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          onPress={confirmSignOut}
          variant="danger"
          fullWidth
          loading={signingOut}
        />
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
  screenTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  profileCard: {
    marginBottom: Spacing.base,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
  },
  infoValue: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  signOutSection: {
    marginTop: 'auto',
    paddingBottom: Spacing['2xl'],
  },
});
