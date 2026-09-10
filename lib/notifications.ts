// lib/notifications.ts
import { supabase } from './supabase';

export type NotificationType = 
  | 'new_proposal'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'new_message'
  | 'escrow_created'
  | 'escrow_released'
  | 'task_completed'
  | 'task_approved'
  | 'dispute_opened'
  | 'new_offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'new_application'
  | 'interview_scheduled'
  | 'escrow_reminder'; 

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

const activeChannels = new Map<string, any>();

export const NotificationService = {
  
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<boolean> {
    console.log(`📤 A criar notificação para: ${userId} | Tipo: ${type}`);
    
    try {
      // Usa a função SQL (RPC) com SECURITY DEFINER para ignorar o RLS e inserir para qualquer user_id
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_reference_id: referenceId || null,
        p_reference_type: referenceType || null,
      });

      if (error) {
        // Log detalhado para facilitar o debug caso o erro 400 volte a acontecer
        console.error('❌ Erro Supabase ao criar notificação:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false;
      }

      console.log('✅ Notificação criada com sucesso! ID:', data);
      return true;
    } catch (err) {
      console.error('❌ Exceção inesperada ao criar notificação:', err);
      return false;
    }
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    console.log('📥 A buscar notificações para:', userId);
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      return [];
    }

    console.log(`📦 ${data?.length || 0} notificações encontradas`);
    return data || [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    console.log('🔢 A contar notificações não lidas para:', userId);
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Erro ao contar notificações:', error);
      return 0;
    }

    const unreadCount = count || 0;
    console.log(`🔔 ${unreadCount} notificações não lidas`);
    return unreadCount;
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Erro ao marcar como lida:', error);
      return false;
    }

    return true;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Erro ao marcar todas como lidas:', error);
      return false;
    }

    return true;
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channelName = `notifications-${userId}`;

    if (activeChannels.has(channelName)) {
      console.log('ℹ️ Canal de notificações já ativo para este utilizador.');
      return () => {};
    }

    console.log(`👂 A ouvir notificações em tempo real para: ${userId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🚨 EVENTO REALTIME DETETADO! 🚨');
          console.log('Payload completo:', payload);
          console.log('Dados da notificação:', payload.new);
          callback(payload.new as Notification);
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Status da subscrição '${channelName}':`, status);
        if (err) {
          console.error('❌ Erro na subscrição realtime:', err);
        }
      });

    activeChannels.set(channelName, channel);

    // Função de cleanup para evitar vazamento de memória
    return () => {
      console.log(`🧹 A remover canal de notificações: ${channelName}`);
      supabase.removeChannel(channel);
      activeChannels.delete(channelName);
    };
  },

  // FUNÇÃO DE TESTE: Cria uma notificação de teste manualmente
  async createTestNotification(userId: string): Promise<boolean> {
    console.log('🧪 A criar notificação de teste...');
    return await this.createNotification(
      userId,
      'new_proposal',
      'Notificação de Teste 🧪',
      'Esta é uma notificação de teste para verificar se o sistema está a funcionar.',
      undefined,
      undefined
    );
  },
};