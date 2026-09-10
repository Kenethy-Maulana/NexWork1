// app/(auth)/welcome.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { Logo } from '../../components/ui/Logo';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Botão de Alternar Tema no Canto Superior Direito */}
      <TouchableOpacity 
        style={[styles.themeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.primary} />
        <Text style={[styles.themeToggleText, { color: colors.text.secondary }]}>
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { maxWidth: width > 600 ? 480 : width }]}>
          
          <View style={styles.header}>
            <Logo size="large" showText={true} />
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Bem-vindo ao NexWork
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                A plataforma definitiva para conectar talento e oportunidade de forma rápida, segura e confiável.
              </Text>
            </View>
          </View>

          <View style={styles.features}>
            <FeatureCard icon="flash" title="Rápido" desc="Encontre ou contrate em minutos" colors={colors} />
            <FeatureCard icon="shield-checkmark" title="Seguro" desc="Pagamentos protegidos por escrow" colors={colors} />
            <FeatureCard icon="star" title="Confiável" desc="Profissionais verificados e avaliados" colors={colors} />
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
                Criar Conta Grátis
              </Text>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.text.secondary }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
            
            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.outlineButtonText, { color: colors.text.primary }]}>
                Já tenho uma conta
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text.light }]}>
              Ao continuar, você concorda com nossos{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Termos de Uso</Text>
              {' '}e{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Política de Privacidade</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureCard = ({ icon, title, desc, colors }: { icon: string, title: string, desc: string, colors: any }) => (
  <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[styles.featureIconBox, { backgroundColor: colors.surfaceLight }]}>
      <Ionicons name={icon as any} size={24} color={colors.primary} />
    </View>
    <View>
      <Text style={[styles.featureTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.featureDesc, { color: colors.text.secondary }]}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
  },
  themeToggleText: { fontSize: 13, fontWeight: '600' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 32, alignSelf: 'center', width: '100%' },
  header: { alignItems: 'center' },
  textContainer: { alignItems: 'center', marginTop: 32, marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },
  features: { gap: 16, marginBottom: 40 },
  featureCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  featureIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  featureDesc: { fontSize: 13, fontWeight: '400' },
  buttonsContainer: { gap: 16, marginBottom: 32 },
  primaryButton: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  primaryButtonText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14, fontWeight: '500' },
  outlineButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5 },
  outlineButtonText: { fontSize: 18, fontWeight: '700' },
  footer: { alignItems: 'center', paddingHorizontal: 16 },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});