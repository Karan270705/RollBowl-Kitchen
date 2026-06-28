import { Stack } from 'expo-router';
import { Colors } from '@/src/constants/theme';

export default function MenuLayout() {
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
