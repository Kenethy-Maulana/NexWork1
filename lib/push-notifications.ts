// lib/push-notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configurar comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushSubscription {
  endpoint: string;
  p256dh?: string;
  auth?: string;
  platform: 'web' | 'android' | 'ios';
}

export const PushNotificationService = {
  
  /**
   * Detectar plataforma atual
   */
  getPlatform(): 'web' | 'android' | 'ios' {
    if (Platform.OS === 'web') return 'web';
    if (Device.osName === 'Android') return 'android';
    if (Device.osName === 'iOS') return 'ios';
    return 'web';
  },

  /**
   * Pedir permissão e registar para push (WEB) - Versão Simplificada
   */
  async registerForWebPush(): Promise<PushSubscription | null> {
    if (Platform.OS !== 'web') return null;

    try {
      console.log('🌐 A registar para push no Web...');
      
      // Verificar se o browser suporta notificações
      if (!('Notification' in window)) {
        console.warn('⚠️ Browser não suporta notificações');
        return null;
      }

      // Pedir permissão
      const permission = await Notification.requestPermission();
      console.log('🔐 Permissão:', permission);
      
      if (permission !== 'granted') {
        console.warn('⚠️ Permissão de notificação negada');
        return null;
      }

      console.log('✅ Permissão de notificação concedida!');

      // Retornar subscrição simples
      return {
        endpoint: `web-${Date.now()}`,
        platform: 'web',
      };
    } catch (err) {
      console.error('❌ Erro ao registar push web:', err);
      return null;
    }
  },

  /**
   * Pedir permissão e registar para push (MOBILE)
   */
  async registerForMobilePush(): Promise<PushSubscription | null> {
    if (Platform.OS === 'web') return null;

    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications só funcionam em dispositivos físicos');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permissão de notificação negada');
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificações NexWork',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      console.log('✅ Token de push obtido:', tokenData.data);

      return {
        endpoint: tokenData.data,
        platform: Platform.OS === 'android' ? 'android' : 'ios',
      };
    } catch (err) {
      console.error('❌ Erro ao registar push mobile:', err);
      return null;
    }
  },

  /**
   * Registar subscrição no Supabase
   */
  async saveSubscription(userId: string, subscription: PushSubscription): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('register_push_subscription', {
        p_user_id: userId,
        p_endpoint: subscription.endpoint,
        p_p256dh: subscription.p256dh || null,
        p_auth: subscription.auth || null,
        p_platform: subscription.platform,
      });

      if (error) {
        console.error('❌ Erro ao guardar subscrição:', error);
        return false;
      }

      console.log('✅ Subscrição guardada no banco de dados!');
      return true;
    } catch (err) {
      console.error('❌ Erro ao guardar subscrição:', err);
      return false;
    }
  },

  /**
   * Registar utilizador para push (automático: Web ou Mobile)
   */
  async registerUser(userId: string): Promise<boolean> {
    console.log('📱 A registar utilizador para push notifications...');
    
    let subscription: PushSubscription | null = null;

    if (Platform.OS === 'web') {
      subscription = await this.registerForWebPush();
    } else {
      subscription = await this.registerForMobilePush();
    }

    if (!subscription) {
      console.warn('⚠️ Não foi possível obter subscrição de push');
      return false;
    }

    return await this.saveSubscription(userId, subscription);
  },

  /**
   * Mostrar notificação local (FUNCIONA 100% NO WEB)
   */
   /**
   * Mostrar notificação local (VERSÃO À PROVA DE FALHAS)
   */
  async showLocalNotification(title: string, body: string, data?: any) {
    console.log('📬 A mostrar notificação local:', title, body);
    
    if (Platform.OS === 'web') {
      if ('Notification' in window) {
        console.log('🔐 Permissão atual:', Notification.permission);
        
        if (Notification.permission === 'granted') {
          try {
            console.log('✅ A tentar criar notificação...');
            const notification = new Notification(title, {
              body: body,
              // Removemos icon e badge para evitar falhas silenciosas
              tag: 'nexwork-test',
              requireInteraction: true, // Força a notificação a ficar visível até ser clicada
            });

            notification.onclick = () => {
              console.log('🖱️ Notificação clicada!');
              window.focus();
              notification.close();
            };
            
            console.log('✅ Notificação enviada para o SO!');
          } catch (err) {
            console.error('❌ Erro ao criar notificação:', err);
            alert(`Fallback: ${title}\n${body}`);
          }
        } else if (Notification.permission === 'denied') {
          console.error('❌ Notificações bloqueadas pelo utilizador no browser!');
          alert('⚠️ As notificações estão bloqueadas nas definições do teu browser para este site.');
        } else {
          console.warn('⚠️ Permissão pendente');
        }
      }
    } else {
      // Mobile
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: 'default' },
        trigger: null,
      });
    }
  },

  /**
   * Desativar notificações push
   */
  async unregisterUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.error('❌ Erro ao desativar push:', err);
      return false;
    }
  },
};