// app/(auth)/login.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  TextInput // ✅ Importação movida para o topo
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { Logo } from '../../components/ui/Logo';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      console.log("🔄 A tentar fazer login com:", email);
      
      await signIn(email, password);
      
      console.log("✅ Login bem-sucedido!");
      // Forçamos o redirecionamento por segurança, caso o AuthContext não o faça
      router.replace('/(tabs)');
      
    } catch (err: any) {
      console.error("❌ ERRO CRÍTICO NO LOGIN:", err);
      // Mostra a mensagem de erro real do Supabase no ecrã
      setError(err.message || 'Email ou palavra-passe incorretos. Verifica a tua ligação à internet.');
    } finally {
      // ✅ ISTO GARANTE QUE O LOADING PARA SEMPRE, MESMO COM ERRO
      setLoading(false); 
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Botão de Voltar (Ajustado para não dar erro na primeira tela) */}
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.surface }]} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Logo e Título */}
            <View style={styles.header}>
              <Logo size="medium" showText={false} />
              <Text style={[styles.title, { color: colors.text.primary }]}>Bem-vindo de volta</Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                Insere as tuas credenciais para aceder à tua conta.
              </Text>
            </View>

            {/* Mensagem de Erro */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Formulário */}
            <View style={styles.form}>
              {/* Campo Email */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Email</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.text.light} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="exemplo@email.com"
                    placeholderTextColor={colors.text.light}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Campo Palavra-passe */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Palavra-passe</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.text.light} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.text.light}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons 
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color={colors.text.light} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Esqueceu a senha */}
              <TouchableOpacity style={styles.forgotPassword} onPress={() => alert('Funcionalidade em breve!')}>
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Esqueceste-te da palavra-passe?</Text>
              </TouchableOpacity>

              {/* Botão de Entrar */}
              <TouchableOpacity 
                style={[styles.loginButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]} 
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={[styles.loginButtonText, { color: colors.text.inverse }]}>Entrar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Rodapé de Registo */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.text.secondary }]}>
                Não tens uma conta?{' '}
                <Text style={[styles.footerLink, { color: colors.primary }]} onPress={() => router.push('/(auth)/register')}>
                  Regista-te aqui
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: { padding: 8 },
  forgotPassword: { alignSelf: 'flex-end', marginTop: -8 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600' },
  loginButton: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 15 },
  footerLink: { fontWeight: '700' },
});