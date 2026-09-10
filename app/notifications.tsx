// app/notifications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService, Notification } from '../lib/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await NotificationService.getNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (notificationId: string, referenceId: string | null, referenceType: string | null) => {
    await NotificationService.markAsRead(notificationId);
    if (referenceId && referenceType) {
      if (referenceType === 'task') router.push({ pathname: '/task-details', params: { id: referenceId } });
      else if (referenceType === 'vacancy') router.push({ pathname: '/vacancy-details', params: { id: referenceId } });
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
      case 'escrow_created': return { name: 'lock-closed' as const, color: colors.warning };
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
        style={[styles.notificationCard, { backgroundColor: colors.surface, borderColor: colors.border }, !item.is_read && { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
        onPress={() => handleMarkAsRead(item.id, item.reference_id, item.reference_type)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.notificationTitle, { color: colors.text.primary }]}>{item.title}</Text>
          <Text style={[styles.notificationMessage, { color: colors.text.secondary }]}>{item.message}</Text>
          <Text style={[styles.notificationDate, { color: colors.text.light }]}>{new Date(item.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><View style={styles.loadingContainer}><Text style={{ color: colors.text.secondary }}>Carregando notificações...</Text></View></SafeAreaView>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        ) : <View style={styles.headerSpacer} />}
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
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhuma notificação ainda</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  markAllButton: { padding: 4 },
  markAllText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: 20, paddingBottom: 40 },
  notificationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  notificationMessage: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  notificationDate: { fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },
});