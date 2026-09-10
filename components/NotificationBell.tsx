// components/NotificationBell.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../lib/notifications';

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius } = useTheme(); // Hook de Tema
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCount = async () => {
      const count = await NotificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surfaceLight }]} 
      onPress={() => router.push('/notifications')}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications" size={24} color={colors.primary} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
    position: 'relative', 
    padding: 10, 
    borderRadius: 9999,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 9999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF', // Borda branca para destacar em qualquer fundo
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});