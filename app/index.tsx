// app/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log("🔍 [INDEX] Verificando auth. Loading:", loading, "User:", user?.email || "Nenhum");
    
    if (!loading) {
      if (user) {
        console.log("✅ [INDEX] Usuário encontrado! Redirecionando para /(tabs)");
        router.replace('/(tabs)');
      } else {
        console.log("❌ [INDEX] Nenhum usuário. Redirecionando para /welcome");
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB' 
  }
});