// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import PushNotificationManager from '../components/PushNotificationManager';
import { SplashScreen } from '../components/SplashScreen';
import { useTheme } from '../styles/theme'; // Hook de Tema

export default function RootLayout() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const { isDark } = useTheme(); // Deteta o tema atual

  const handleSplashFinish = () => {
    setIsSplashFinished(true);
  };

  return (
    <>
      {/* A StatusBar adapta-se: 'light' para modo escuro, 'dark' para modo claro */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <AuthProvider>
        <PushNotificationManager />
        
        {!isSplashFinished ? (
          <SplashScreen onFinish={handleSplashFinish} />
        ) : (
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        )}
      </AuthProvider>
    </>
  );
}