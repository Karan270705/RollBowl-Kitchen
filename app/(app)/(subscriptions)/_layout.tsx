import { Stack } from 'expo-router';
import { Colors } from '@/src/constants/theme';

export default function SubscriptionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
