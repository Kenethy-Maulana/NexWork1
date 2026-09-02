import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, fontSize, fontWeight, spacing } from '../styles/theme';
import { Button } from '../components/ui/Button';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>Página não encontrada</Text>
        <Link href="/(auth)/welcome" asChild>
          <Button title="Voltar ao início" onPress={() => {}} />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  title: { fontSize: 64, fontWeight: fontWeight.bold as any, color: colors.primary, marginBottom: spacing.md },
  subtitle: { fontSize: fontSize.xl, color: colors.text.secondary, marginBottom: spacing.xl },
});