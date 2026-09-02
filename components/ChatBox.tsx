// components/ChatBox.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatBoxProps {
  taskId: string;
  otherUserId: string;
  otherUserName: string;
}

export default function ChatBox({ taskId, otherUserId, otherUserName }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (taskId && user?.id) {
      fetchMessages();
      
      // Subscrever a novas mensagens em tempo real
      const channel = supabase
        .channel(`chat-${taskId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `task_id=eq.${taskId}`,
          },
          (payload) => {
            console.log('💬 Nova mensagem recebida em tempo real!');
            const newMsg = payload.new as Message;
            
            setMessages((prev) => {
              // Evitar duplicatas
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            scrollToBottom();
            
            // Marcar como lida se a mensagem for para mim
            if (newMsg.receiver_id === user.id && newMsg.sender_id !== user.id) {
              markMessagesAsRead();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Status do chat:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [taskId, user?.id]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
    } else {
      setMessages(data || []);
      // Marcar mensagens recebidas como lidas
      await markMessagesAsRead();
      scrollToBottom();
    }
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_user_id: user.id,
        p_task_id: taskId,
      });
    } catch (err) {
      console.error('❌ Erro ao marcar mensagens como lidas:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Usar a função SQL segura que cria mensagem + notificação
      const { data, error } = await supabase.rpc('send_message', {
        p_task_id: taskId,
        p_sender_id: user.id,
        p_receiver_id: otherUserId,
        p_message: messageText,
      });

      if (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem: ' + error.message);
        setNewMessage(messageText); // Restaurar a mensagem em caso de erro
      } else {
        console.log('✅ Mensagem enviada com sucesso! ID:', data);
      }
    } catch (err: any) {
      console.error('❌ Exceção ao enviar mensagem:', err);
      alert('Erro: ' + err.message);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }) + ' ' + 
           date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={20} color={colors.primary} />
        <Text style={styles.headerTitle}>Chat com {otherUserName}</Text>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando mensagens...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.text.light} />
            <Text style={styles.emptyText}>Nenhuma mensagem ainda.</Text>
            <Text style={styles.emptySubtext}>Inicie a conversa com {otherUserName}!</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <View key={msg.id} style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                  <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                    {msg.message}
                  </Text>
                  <View style={[styles.messageFooter, isMe ? styles.myMessageFooter : styles.otherMessageFooter]}>
                    <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                      {formatTime(msg.created_at)}
                    </Text>
                    {isMe && (
                      <Ionicons 
                        name={msg.is_read ? 'checkmark-done' : 'checkmark'} 
                        size={14} 
                        color={msg.is_read ? '#4FC3F7' : 'rgba(255,255,255,0.6)'} 
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escreva uma mensagem..."
          placeholderTextColor={colors.text.light}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Ionicons 
            name={sending ? 'hourglass-outline' : 'send'} 
            size={18} 
            color={newMessage.trim() && !sending ? colors.surface : colors.text.light} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { 
    fontSize: fontSize.md, 
    fontWeight: '700', 
    color: colors.text.primary,
    flex: 1,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  messagesContainer: { 
    maxHeight: 400,
    minHeight: 200,
  },
  messagesContent: { 
    padding: spacing.md,
    gap: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  messageWrapper: {
    flexDirection: 'row',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
  },
  otherMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  myMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  otherMessage: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.surface,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  myMessageFooter: {
    justifyContent: 'flex-end',
  },
  otherMessageFooter: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    fontSize: 10,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceDark,
  },
});