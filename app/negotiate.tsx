// app/negotiate.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Proposal, Message } from '../lib/supabase';

export default function NegotiateScreen() {
  const router = useRouter();
  const { proposalId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [taskInfo, setTaskInfo] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (proposalId) {
      fetchProposal();
      fetchMessages();
    }
  }, [proposalId]);

  const fetchProposal = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        worker:profiles!worker_id(full_name, company_name, avatar_url, user_type)
      `)
      .eq('id', proposalId)
      .single();

    if (error) {
      Alert.alert('Erro', 'Proposta não encontrada');
      router.replace('/(tabs)');
    } else {
      setProposal(data);
      // Buscar informações da tarefa
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title, client_id')
        .eq('id', data.task_id)
        .single();
      setTaskInfo(taskData);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(full_name, company_name, avatar_url, user_type)
      `)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      proposal_id: proposalId,
      sender_id: user.id,
      message: newMessage.trim(),
    });

    setSending(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    } else {
      setNewMessage('');
      fetchMessages();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!proposal) return null;

  const workerName = proposal.worker?.user_type === 'company' 
    ? proposal.worker?.company_name 
    : proposal.worker?.full_name;

  const isWorker = user?.id === proposal.worker_id;
  const isClient = taskInfo && user?.id === taskInfo.client_id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Negociar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info da Proposta */}
      <View style={styles.proposalInfo}>
        <View style={styles.workerHeader}>
          <View style={styles.workerAvatar}>
            <Ionicons name={isWorker ? "briefcase" : "person"} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName}>
              {isWorker ? 'Cliente' : workerName || 'Trabalhador'}
            </Text>
            <Text style={styles.proposalDetails}>
              Proposta: {formatCurrency(proposal.price)} • {proposal.deadline_days} dias
            </Text>
            {taskInfo && (
              <Text style={styles.taskTitle} numberOfLines={1}>
                Tarefa: {taskInfo.title}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.roleBadge}>
          <Ionicons name={isWorker ? "hammer" : "cash"} size={14} color={colors.primary} />
          <Text style={styles.roleText}>
            Você é {isWorker ? 'o Trabalhador' : 'o Cliente'}
          </Text>
        </View>
      </View>

      {/* Área de Mensagens */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.text.light} />
              <Text style={styles.emptyText}>Inicie a negociação</Text>
              <Text style={styles.emptySubtext}>
                {isWorker 
                  ? 'Envie uma mensagem para discutir os detalhes com o cliente'
                  : 'Envie uma mensagem para discutir os detalhes com o trabalhador'
                }
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const senderName = msg.sender?.user_type === 'company'
                ? msg.sender?.company_name
                : msg.sender?.full_name;

              return (
                <View key={msg.id} style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                  {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
                  <Text style={[styles.messageText, isMe && styles.myMessageText]}>{msg.message}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input de Mensagem */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Ionicons name="send" size={20} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  proposalInfo: { backgroundColor: colors.surface, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  workerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  workerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  proposalDetails: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  taskTitle: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs, fontWeight: '500' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceDark, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  roleText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  messagesContainer: { flex: 1 },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.md },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
  messageBubble: { maxWidth: '80%', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  myMessage: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  senderName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary, marginBottom: spacing.xs },
  messageText: { fontSize: fontSize.md, color: colors.text.primary, lineHeight: 20 },
  myMessageText: { color: colors.surface },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  messageInput: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: fontSize.md, maxHeight: 100, minHeight: 40 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: colors.border },
});