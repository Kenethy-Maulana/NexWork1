// components/PushNotificationManager.tsx
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PushNotificationService } from '../lib/push-notifications';
import { supabase } from '../lib/supabase';

export default function PushNotificationManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 PushNotificationManager: Iniciando para user:', user.id);

    // Registar para push quando o utilizador faz login
    const setupPush = async () => {
      console.log('📱 A configurar push notifications...');
      const success = await PushNotificationService.registerUser(user.id);
      if (success) {
        console.log('✅ Push notifications configuradas com sucesso!');
      } else {
        console.warn('⚠️ Falha ao configurar push notifications');
      }
    };

    setupPush();

    // Subscrever a novas notificações no banco e mostrar push local
    const channelName = `push-notifications-${user.id}`;
    
    console.log('👂 A ouvir notificações em tempo real...');
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🚨 NOVA NOTIFICAÇÃO DETETADA!');
          console.log('Payload:', payload);
          
          const notification = payload.new;
          console.log('📬 A mostrar push para:', notification.title);
          
          PushNotificationService.showLocalNotification(
            notification.title,
            notification.message,
            { 
              notificationId: notification.id,
              referenceId: notification.reference_id,
              referenceType: notification.reference_type,
            }
          );
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição push:', status);
      });

    return () => {
      console.log('🧹 A remover subscrição push...');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Este componente não renderiza nada visual
  return null;
}