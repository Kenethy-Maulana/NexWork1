// app/+not-found.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';

export default function NotFoundScreen() {
  // Usamos o hook para garantir que temos acesso a todas as variáveis de tema
  const { colors, spacing, fontSize } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Ionicons name="alert-circle-outline" size={80} color={colors.error} />
        
        <Text style={[styles.title, { color: colors.text.primary, fontSize: fontSize.xxxl }]}>
          404
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: fontSize.lg, marginBottom: spacing.xl }]}>
          Esta página não foi encontrada.
        </Text>
        
        <Link href="/" asChild>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.text.inverse, fontSize: fontSize.md }]}>
              Voltar ao Início
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

// Estilos estáticos base (as cores e espaçamentos dinâmicos são aplicados via inline style acima)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    fontWeight: '700',
  },
});