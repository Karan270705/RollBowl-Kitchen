import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { signIn } from '@/src/services/auth';
import { fetchUserProfile } from '@/src/services/auth';
import { useAuthStore } from '@/src/store';
import { UserRole } from '@/src/constants/enums';

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const { session } = await signIn({ email: email.trim(), password });

      if (!session) {
        setError('Login failed. Please try again.');
        return;
      }

      // Fetch user profile to check role
      const user = await fetchUserProfile(session.user.id);

      if (!user) {
        setError('Account not found. Contact your administrator.');
        return;
      }

      // Set session — the entry redirect will handle role gating
      setSession(session, user);

      // Navigate based on role
      if (user.role === UserRole.CUSTOMER) {
        router.replace('/access-denied' as any);
      } else {
        router.replace('/(app)/(dashboard)' as any);
      }
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred';
      if (message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (message.includes('Email not confirmed')) {
        setError('Email not confirmed. Contact your administrator.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.primaryMuted, Colors.transparent]}
            style={styles.headerGlow}
          />
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="restaurant" size={32} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.appName}>RollBowl</Text>
          <Text style={styles.appSubtitle}>Kitchen</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Staff Portal</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@rollbowl.in"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={styles.loginButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={14} color={Colors.textTertiary} />
          <Text style={styles.footerText}>
            Staff accounts only. Contact admin for access.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    paddingTop: Spacing['5xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.6,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: Radii.xl,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  appName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size['3xl'],
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.xl,
    color: Colors.primary,
    marginTop: -2,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    marginVertical: Spacing.md,
    borderRadius: 1,
  },
  tagline: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorMuted,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.error,
    flex: 1,
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    opacity: 0.6,
  },
  footerText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
  },
});
