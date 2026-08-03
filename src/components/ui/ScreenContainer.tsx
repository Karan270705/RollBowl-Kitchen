import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing } from '@/src/constants/theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle | ViewStyle[];
  contentContainerStyle?: ViewStyle | ViewStyle[];
  safeAreaEdges?: ('top' | 'right' | 'bottom' | 'left')[];
  withPadding?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  safeAreaEdges = ['top', 'left', 'right'],
  withPadding = true,
}) => {
  const containerStyle = [
    styles.container,
    withPadding && styles.padded,
    style,
  ];

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={safeAreaEdges}
    >
      <StatusBar style="light" backgroundColor={Colors.background} />
      {scrollable ? (
        <ScrollView
          style={containerStyle}
          contentContainerStyle={[
            styles.scrollContent,
            withPadding && styles.scrollPadded,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={containerStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
};

export const AppScreen = ScreenContainer;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  padded: {
    paddingHorizontal: Spacing.base,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollPadded: {
    paddingBottom: Spacing['2xl'],
  },
});
