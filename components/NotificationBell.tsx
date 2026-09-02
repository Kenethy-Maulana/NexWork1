// components/NotificationBell.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../lib/notifications';

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      console.log('⚠️ NotificationBell: user.id não definido');
      return;
    }

    console.log('🔔 NotificationBell: Iniciando para user:', user.id);

    // Função para buscar contagem
    const fetchCount = async () => {
      console.log('🔍 A buscar contagem de notificações...');
      const count = await NotificationService.getUnreadCount(user.id);
      console.log(`✅ Contagem encontrada: ${count}`);
      setUnreadCount(count);
    };

    // Buscar imediatamente
    fetchCount();

    // Polling a cada 5 segundos (mais rápido para teste)
    const interval = setInterval(() => {
      console.log('🔄 Polling: A verificar...');
      fetchCount();
    }, 5000);

    // Cleanup
    return () => {
      console.log('🧹 NotificationBell: Limpando interval');
      clearInterval(interval);
    };
  }, [user?.id]);

  console.log(`🎨 Renderizando sino com contador: ${unreadCount}`);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => router.push('/notifications')}
    >
      <Ionicons name="notifications-outline" size={28} color={colors.primary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
    position: 'relative', 
    padding: spacing.xs, 
    marginRight: spacing.sm 
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.surface,
    fontWeight: '700',
  },
});