// app/negotiate.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Proposal, Message } from '../lib/supabase';

export default function NegotiateScreen() {
  const router = useRouter();
  const { proposalId } = useLocalSearchParams();
  const { user } = useAuth();
  // ✅ CORREÇÃO: Usar o hook useTheme
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
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
      .select(`*, worker:profiles!worker_id(full_name, company_name, avatar_url, user_type)`)
      .eq('id', proposalId)
      .single();

    if (error) {
      Alert.alert('Erro', 'Proposta não encontrada');
      router.replace('/(tabs)');
    } else {
      setProposal(data);
      const { data: taskData } = await supabase.from('tasks').select('title, client_id').eq('id', data.task_id).single();
      setTaskInfo(taskData);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:profiles!sender_id(full_name, company_name, avatar_url, user_type)`)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (!error && data) setMessages(data);
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
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.secondary }}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!proposal) return null;

  const workerName = proposal.worker?.user_type === 'company' ? proposal.worker?.company_name : proposal.worker?.full_name;
  const isWorker = user?.id === proposal.worker_id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Negociar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info da Proposta */}
      <View style={[styles.proposalInfo, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.workerHeader}>
          <View style={[styles.workerAvatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name={isWorker ? "briefcase" : "person"} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.workerName, { color: colors.text.primary }]}>
              {isWorker ? 'Cliente' : workerName || 'Trabalhador'}
            </Text>
            <Text style={[styles.proposalDetails, { color: colors.text.secondary }]}>
              Proposta: {formatCurrency(proposal.price)} • {proposal.deadline_days} dias
            </Text>
            {taskInfo && (
              <Text style={[styles.taskTitle, { color: colors.primary }]} numberOfLines={1}>
                Tarefa: {taskInfo.title}
              </Text>
            )}
          </View>
        </View>
        
        <View style={[styles.roleBadge, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name={isWorker ? "hammer" : "cash"} size={14} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>
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
              <Text style={[styles.emptyText, { color: colors.text.primary }]}>Inicie a negociação</Text>
              <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                {isWorker 
                  ? 'Envie uma mensagem para discutir os detalhes com o cliente'
                  : 'Envie uma mensagem para discutir os detalhes com o trabalhador'
                }
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const senderName = msg.sender?.user_type === 'company' ? msg.sender?.company_name : msg.sender?.full_name;

              return (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubble, 
                    isMe 
                      ? { backgroundColor: colors.primary } 
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } // Borda para modo escuro
                  ]}
                >
                  {!isMe && <Text style={[styles.senderName, { color: colors.primary }]}>{senderName}</Text>}
                  <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.text.primary }]}>
                    {msg.message}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input de Mensagem */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.messageInput, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border }]}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.text.light}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: newMessage.trim() && !sending ? colors.primary : colors.surfaceLight }]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={newMessage.trim() && !sending ? '#FFFFFF' : colors.text.light} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos estáticos (apenas layout)
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  proposalInfo: { padding: 16, borderBottomWidth: 1 },
  workerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  workerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: 15, fontWeight: '600' },
  proposalDetails: { fontSize: 13, marginTop: 4 },
  taskTitle: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  roleText: { fontSize: 12, fontWeight: '600' },
  messagesContainer: { flex: 1 },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 12 },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  senderName: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 10 },
  messageInput: { flex: 1, borderRadius: 20, padding: 12, fontSize: 15, maxHeight: 100, minHeight: 44, borderWidth: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
});