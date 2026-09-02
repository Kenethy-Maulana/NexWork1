// app/notifications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService, Notification } from '../lib/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const data = await NotificationService.getNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (notificationId: string, referenceId: string | null, referenceType: string | null) => {
    await NotificationService.markAsRead(notificationId);
    
    // Navegar para a referência se existir
    if (referenceId && referenceType) {
      switch (referenceType) {
        case 'task':
          router.push({ pathname: '/task-details', params: { id: referenceId } });
          break;
        case 'proposal':
          // Buscar task_id da proposta e navegar
          break;
        case 'vacancy':
          router.push({ pathname: '/vacancy-details', params: { id: referenceId } });
          break;
      }
    }
    
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    await NotificationService.markAllAsRead(user.id);
    fetchNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_proposal': return { name: 'document-text' as const, color: colors.primary };
      case 'proposal_accepted': return { name: 'checkmark-circle' as const, color: colors.success };
      case 'proposal_rejected': return { name: 'close-circle' as const, color: colors.error };
      case 'new_message': return { name: 'chatbubble' as const, color: colors.primary };
      case 'escrow_created': return { name: 'lock-closed' as const, color: '#F59E0B' };
      case 'escrow_released': return { name: 'lock-open' as const, color: colors.success };
      case 'task_completed': return { name: 'checkmark-done' as const, color: colors.success };
      case 'task_approved': return { name: 'thumbs-up' as const, color: colors.success };
      case 'dispute_opened': return { name: 'warning' as const, color: colors.error };
      case 'new_offer': return { name: 'mail' as const, color: colors.primary };
      case 'offer_accepted': return { name: 'checkmark-circle' as const, color: colors.success };
      case 'offer_rejected': return { name: 'close-circle' as const, color: colors.error };
      case 'new_application': return { name: 'person-add' as const, color: colors.primary };
      case 'interview_scheduled': return { name: 'calendar' as const, color: colors.primary };
      default: return { name: 'notifications' as const, color: colors.text.secondary };
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getIcon(item.type);
    
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleMarkAsRead(item.id, item.reference_id, item.reference_type)}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationDate}>
            {new Date(item.created_at).toLocaleDateString('pt-MZ', { 
              day: '2-digit', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando notificações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.headerSpacer} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>Nenhuma notificação ainda</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  markAllButton: { padding: spacing.xs },
  markAllText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  notificationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  unreadCard: { backgroundColor: '#EFF6FF', borderColor: colors.primary },
  iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  notificationMessage: { fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 20, marginBottom: spacing.xs },
  notificationDate: { fontSize: fontSize.xs, color: colors.text.light },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
});