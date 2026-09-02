// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import PushNotificationManager from '../components/PushNotificationManager'; // <-- ADICIONAR

export default function RootLayout() {
  return (
    <AuthProvider>
      <PushNotificationManager /> {/* <-- ADICIONAR */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}