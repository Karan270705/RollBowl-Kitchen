import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { signOut } from '@/src/services/auth';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
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

  const handleTestSpike = async () => {
    try {
      setSigningOut(true); // just reusing loading state for quick test
      
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const wsSummary = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Total Revenue', 5000],
        ['Most Popular', 'Paneer Roll 🌶️']
      ]);
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Orders Sheet
      const wsOrders = XLSX.utils.aoa_to_sheet([
        ['Order ID', 'Date', 'Customer Name', 'Total Amount', 'Notes'],
        ['ORD-1234567890123456789', new Date(), 'Rajesh Kumar', 250.50, 'Extra spicy,\nplease!'],
        ['ORD-9876543210987654321', new Date(), 'Priya Sharma', 150.00, 'No onions']
      ]);
      wsOrders['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

      // Order Items Sheet
      const wsItems = XLSX.utils.aoa_to_sheet([
        ['Order ID', 'Item Name', 'Quantity', 'Price'],
        ['ORD-1234567890123456789', 'Paneer Tikka Roll', 2, 125.25],
        ['ORD-9876543210987654321', 'Aloo Paratha', 1, 150.00]
      ]);
      wsItems['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsItems, 'Order Items');

      // Generate base64
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      const uri = FileSystem.cacheDirectory + 'RollBowl_SheetJSSpike.xlsx';
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Share SheetJS Spike'
        });
      } else {
        Alert.alert('Error', 'Sharing not available on this device');
      }
    } catch (error: any) {
      Alert.alert('Spike Failed', error.message);
    } finally {
      setSigningOut(false);
    }
  };

  const handleTestCsvSpike = async () => {
    try {
      setSigningOut(true);
      
      // Helper to safely escape CSV fields
      const escapeCsv = (val: any) => {
        if (val == null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = [
        ['Order ID', 'Customer Name', 'Notes', 'Total (₹)'],
        ['ORD-1', 'Aisha Khan', 'No onions, please', 250.50],
        ['ORD-2', 'Suresh 🌟', 'Call on arrival\n"Urgent"', 150.00]
      ];
      
      // Add UTF-8 BOM (\uFEFF) for Excel compatibility
      const csvContent = '\uFEFF' + rows.map(r => r.map(escapeCsv).join(',')).join('\n');
      
      const uri = FileSystem.cacheDirectory + 'RollBowl_SpikeTest.csv';
      await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Error', 'Sharing not available on this device');
      }
    } catch (error: any) {
      Alert.alert('CSV Spike Failed', error.message);
    } finally {
      setSigningOut(false);
    }
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

        <View style={styles.infoDivider} />

        <TouchableOpacity 
          style={styles.infoRow}
          onPress={handleTestSpike}
          disabled={signingOut}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="document-text-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.infoLabel}>TEST XLSX SPIKE</Text>
          </View>
          {signingOut ? (
            <Text style={{color: Colors.textSecondary, fontSize: 12}}>Running...</Text>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
          )}
        </TouchableOpacity>

        <View style={styles.infoDivider} />

        <TouchableOpacity 
          style={styles.infoRow}
          onPress={handleTestCsvSpike}
          disabled={signingOut}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="document-text-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.infoLabel}>TEST CSV SPIKE</Text>
          </View>
          {signingOut ? (
            <Text style={{color: Colors.textSecondary, fontSize: 12}}>Running...</Text>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
          )}
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
