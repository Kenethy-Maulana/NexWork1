// app/(auth)/register.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SuccessModal } from '../../components/ui/SuccessModal'; // ✅ ADICIONADO
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // ✅ ADICIONADO

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    setLoading(false);
    if (error) Alert.alert('Erro', 'Falha ao conectar com o Google: ' + error.message);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      Alert.alert('Erro no cadastro', error.message);
    } else {
      setShowSuccess(true); // ✅ SUBSTITUIU O ALERT
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { paddingHorizontal: spacing.xl, paddingTop: spacing.xl }]}>
          <View style={styles.header}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface, shadowColor: colors.text.primary }]} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>Criar Conta</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Junte-se ao NexWork e comece a trabalhar</Text>
          </View>

          <View style={styles.form}>
            <Input label="Nome Completo" placeholder="Seu nome" value={name} onChangeText={setName} icon="person-outline" />
            <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />
            <Input label="Palavra-passe" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" />
            
            <Button title="Cadastrar" onPress={handleRegister} variant="primary" size="large" fullWidth loading={loading} />
            
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.text.secondary }]}>ou continue com</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button title="Cadastrar com Google" onPress={handleGoogleAuth} variant="outline" size="large" fullWidth loading={loading} icon={<Ionicons name="logo-google" size={20} color={colors.primary} />} />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Faça Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ✅ MODAL DE SUCESSO */}
      <SuccessModal 
        visible={showSuccess} 
        title="Conta Criada! 🎉" 
        message="Bem-vindo ao NexWork. A tua conta foi criada com sucesso e já podes começar a explorar." 
        onClose={() => {
          setShowSuccess(false);
          router.replace('/(tabs)');
        }} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center' },
  header: { marginBottom: 32 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  form: { gap: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32, paddingBottom: 32 },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '700' }
});