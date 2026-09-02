// app/admin-login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { AdminAuthService } from '../lib/admin-auth';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  useEffect(() => {
    // 1. Verificar se já tem sessão válida de admin
    const checkSession = async () => {
      const admin = await AdminAuthService.getCurrentAdmin();
      if (admin) {
        router.replace('/admin');
      }
    };
    checkSession();

    // 2. Obter IP para display (segurança)
    if (Platform.OS === 'web') {
      fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(data => setIpAddress(data.ip))
        .catch(() => {});
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    
    setError('');
    setLoading(true);
    
    // Usa o método de login nativo e seguro do Supabase
    const result = await AdminAuthService.login(email, password);
    setLoading(false);
    
    if (result.success) {
      router.replace('/admin');
    } else {
      setError(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acesso Restrito</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.iconContainer}>
            <View style={styles.shieldIcon}>
              <Ionicons name="shield-checkmark" size={48} color={colors.surface} />
            </View>
          </View>

          <Text style={styles.title}>Painel Administrativo</Text>
          <Text style={styles.subtitle}>Área exclusiva para administradores autorizados</Text>

          <Input
            label="Email Administrativo"
            placeholder="admin@nexwork.mz"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          <Button
            title="Entrar no Painel"
            onPress={handleLogin}
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.securityBox}>
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed" size={14} color={colors.text.secondary} />
              <Text style={styles.securityText}>Conexão encriptada (SSL/TLS)</Text>
            </View>
            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark" size={14} color={colors.text.secondary} />
              <Text style={styles.securityText}>Autenticação via Supabase Auth</Text>
            </View>
            <View style={styles.securityRow}>
              <Ionicons name="document-text" size={14} color={colors.text.secondary} />
              <Text style={styles.securityText}>Todas as ações são auditadas</Text>
            </View>
            {ipAddress ? (
              <View style={styles.securityRow}>
                <Ionicons name="globe" size={14} color={colors.text.secondary} />
                <Text style={styles.securityText}>IP: {ipAddress}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.lg },
  iconContainer: { alignItems: 'center', marginBottom: spacing.md },
  shieldIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: 'center' },
  passwordContainer: { position: 'relative' },
  eyeButton: { position: 'absolute', right: spacing.md, top: 42, padding: spacing.xs },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#FEE2E2', padding: spacing.md, borderRadius: borderRadius.md,
  },
  errorText: { flex: 1, fontSize: fontSize.sm, color: colors.error },
  securityBox: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm, marginTop: spacing.lg,
  },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  securityText: { fontSize: fontSize.xs, color: colors.text.secondary },
});