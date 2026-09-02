// app/(auth)/login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../styles/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      console.log("✅ [LOGIN] Usuário já logado, redirecionando...");
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleGoogleAuth = async () => {
    console.log("🚀 [GOOGLE] Iniciando fluxo de OAuth do Supabase...");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Isso garante que o Google saiba para onde voltar
        redirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081',
      },
    });
    
    setLoading(false);

    if (error) {
      console.error("❌ [GOOGLE] Erro no Supabase OAuth:", error);
      Alert.alert('Erro', 'Falha ao conectar com o Google: ' + error.message);
    }
    // Se não houver erro, o navegador será redirecionado para o Google automaticamente.
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Erro no login', 'E-mail ou senha incorretos.');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Faça login para continuar no NexWork</Text>
          </View>

          <View style={styles.form}>
            <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />
            <Input label="Senha" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" />
            
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <Button title="Entrar" onPress={handleLogin} variant="primary" size="large" fullWidth loading={loading} />
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou continue com</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button 
              title="Entrar com Google" 
              onPress={handleGoogleAuth} 
              variant="outline" 
              size="large" 
              fullWidth 
              loading={loading}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, justifyContent: 'center' },
  header: { marginBottom: spacing.xxl },
  backButton: { width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24 },
  form: { gap: spacing.md },
  forgotPassword: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 8 },
  forgotPasswordText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.text.secondary, marginHorizontal: spacing.md, fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl, paddingBottom: spacing.xl },
  footerText: { fontSize: fontSize.sm, color: colors.text.secondary },
  footerLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' }
});