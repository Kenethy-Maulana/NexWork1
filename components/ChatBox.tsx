// components/ChatBox.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
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
  const { colors, spacing, borderRadius, fontSize } = useTheme(); // Hook de Tema
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (taskId && user?.id) {
      fetchMessages();
      
      const channel = supabase
        .channel(`chat-${taskId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${taskId}` }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          scrollToBottom();
          if (newMsg.receiver_id === user.id && newMsg.sender_id !== user.id) {
            markMessagesAsRead();
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [taskId, user?.id]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('messages').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (!error) {
      setMessages(data || []);
      await markMessagesAsRead();
      scrollToBottom();
    }
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!user?.id) return;
    try {
      await supabase.rpc('mark_messages_as_read', { p_user_id: user.id, p_task_id: taskId });
    } catch (err) { console.error('Erro ao marcar como lidas:', err); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || sending) return;
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { error } = await supabase.rpc('send_message', {
        p_task_id: taskId, p_sender_id: user.id, p_receiver_id: otherUserId, p_message: messageText,
      });
      if (error) {
        alert('Erro ao enviar: ' + error.message);
        setNewMessage(messageText);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const isToday = date.toDateString() === new Date().toDateString();
    return isToday 
      ? date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{otherUserName}</Text>
          <View style={styles.onlineIndicator}>
            <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.onlineText, { color: colors.text.secondary }]}>Online</Text>
          </View>
        </View>
      </View>

      {/* Mensagens */}
      <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false} onContentSizeChange={scrollToBottom}>
        {loading ? (
          <View style={styles.loadingContainer}><Text style={[styles.loadingText, { color: colors.text.secondary }]}>Carregando mensagens...</Text></View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>Nenhuma mensagem ainda.</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>Inicie a conversa com {otherUserName}!</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <View key={msg.id} style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                <View style={[
                  styles.messageBubble, 
                  isMe ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 } : { backgroundColor: colors.surfaceLight, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border }
                ]}>
                  <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.text.primary }]}>
                    {msg.message}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.text.secondary }]}>
                      {formatTime(msg.created_at)}
                    </Text>
                    {isMe && (
                      <Ionicons name={msg.is_read ? 'checkmark-done' : 'checkmark'} size={14} color={msg.is_read ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border, borderRadius: borderRadius.full }]}
          placeholder="Escreva uma mensagem..."
          placeholderTextColor={colors.text.light}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: newMessage.trim() && !sending ? colors.primary : colors.surfaceLight }]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          activeOpacity={0.7}
        >
          <Ionicons name={sending ? 'hourglass' : 'send'} size={18} color={newMessage.trim() && !sending ? '#FFFFFF' : colors.text.light} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  messageWrapper: { flexDirection: 'row', maxWidth: '85%' },
  myMessageWrapper: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  otherMessageWrapper: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'flex-end' },
  messageTime: { fontSize: 11 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, borderWidth: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
});