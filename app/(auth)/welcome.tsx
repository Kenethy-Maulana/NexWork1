import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent />
      
      <View style={styles.background}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, isWeb && styles.webContent]}>
            
            {/* Logo Simplificado e Elegante */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>Nex</Text>
                <Text style={[styles.logoText, { color: '#1D4ED8' }]}>Work</Text>
              </View>
            </View>

            {/* Título */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>Conecte-se ao Trabalho</Text>
              <Text style={styles.subtitle}>
                Encontre serviços ou ofereça seu trabalho de forma rápida, segura e confiável em Moçambique.
              </Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              <View style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureIconText}>⚡</Text>
                </View>
                <Text style={styles.featureText}>Rápido</Text>
              </View>
              
              <View style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureIconText}>🔒</Text>
                </View>
                <Text style={styles.featureText}>Seguro</Text>
              </View>
              
              <View style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureIconText}>✓</Text>
                </View>
                <Text style={styles.featureText}>Confiável</Text>
              </View>
            </View>

            {/* Botões */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Começar Agora</Text>
              </TouchableOpacity>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>Já tenho conta</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.footer, isWeb && styles.webFooter]}>
            <Text style={styles.footerText}>
              Ao continuar, você concorda com nossos Termos e Política de Privacidade
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  background: {
    flex: 1,
    backgroundColor: '#2563EB', // Azul NexWork (substitui o gradiente para evitar erros)
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  webContent: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  textContainer: {
    alignItems: 'center',
    marginVertical: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 48,
  },
  feature: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 28,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  buttonsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: '#FFFFFF',
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  webFooter: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  footerText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
});