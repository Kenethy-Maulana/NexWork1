// app/admin-login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { AdminAuthService } from '../lib/admin-auth';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const admin = await AdminAuthService.getCurrentAdmin();
      if (admin) router.replace('/admin');
    };
    checkSession();
    if (Platform.OS === 'web') {
      fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => setIpAddress(data.ip)).catch(() => {});
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha todos os campos'); return; }
    setError('');
    setLoading(true);
    const result = await AdminAuthService.login(email, password);
    setLoading(false);
    if (result.success) router.replace('/admin');
    else setError(result.message);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Acesso Restrito</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.iconContainer}>
            <View style={[styles.shieldIcon, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
              <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>Painel Administrativo</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Área exclusiva para administradores autorizados</Text>

          <Input label="Email Administrativo" placeholder="admin@nexwork.mz" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />

          <View style={styles.passwordContainer}>
            <Input label="Palavra-passe" placeholder="••••••••" value={password} onChangeText={setPassword} icon="lock-closed-outline" secureTextEntry={!showPassword} />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Button title="Entrar no Painel" onPress={handleLogin} variant="primary" size="large" fullWidth loading={loading} />

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.securityBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.securityRow}><Ionicons name="lock-closed" size={14} color={colors.text.secondary} /><Text style={[styles.securityText, { color: colors.text.secondary }]}>Conexão encriptada (SSL/TLS)</Text></View>
            <View style={styles.securityRow}><Ionicons name="shield-checkmark" size={14} color={colors.text.secondary} /><Text style={[styles.securityText, { color: colors.text.secondary }]}>Autenticação via Supabase Auth</Text></View>
            <View style={styles.securityRow}><Ionicons name="document-text" size={14} color={colors.text.secondary} /><Text style={[styles.securityText, { color: colors.text.secondary }]}>Todas as ações são auditadas</Text></View>
            {ipAddress ? <View style={styles.securityRow}><Ionicons name="globe" size={14} color={colors.text.secondary} /><Text style={[styles.securityText, { color: colors.text.secondary }]}>IP: {ipAddress}</Text></View> : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  form: { gap: 20 },
  iconContainer: { alignItems: 'center', marginBottom: 16 },
  shieldIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center' },
  passwordContainer: { position: 'relative' },
  eyeButton: { position: 'absolute', right: 16, top: 42, padding: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 14 },
  securityBox: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 10, marginTop: 20 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { fontSize: 13 },
});