// app/send-proposal.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications'; // <-- ADICIONADO

export default function SendProposalScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [price, setPrice] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitProposal = async () => {
    if (!price || !deadlineDays || !message) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (!user) {
      alert('Você precisa estar logado.');
      return;
    }

    setLoading(true);

    // Buscar o client_id da tarefa para notificar
    const { data: taskData } = await supabase.from('tasks').select('client_id, title').eq('id', taskId).single();

    const { error } = await supabase.from('proposals').insert({
      task_id: taskId,
      worker_id: user.id,
      price: parseFloat(price.replace(',', '.')),
      deadline_days: parseInt(deadlineDays),
      message,
      status: 'pending',
    });

    setLoading(false);

    if (error) {
      console.error('Erro ao enviar proposta:', error);
      alert('Não foi possível enviar a proposta.');
    } else {
      // 🔔 NOTIFICAÇÃO: Avisar o cliente da nova proposta
      if (taskData) {
        await NotificationService.createNotification(
          taskData.client_id,
          'new_proposal',
          'Nova Proposta Recebida! 📩',
          `Um trabalhador enviou uma proposta de ${parseFloat(price.replace(',', '.')).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })} para a sua tarefa "${taskData.title}".`,
          String(taskId),
          'task'
        );
      }
      
      alert('✅ Proposta enviada com sucesso! O cliente será notificado.');
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enviar Proposta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.introText}>
            Envie sua proposta para esta tarefa. Seja claro sobre o preço e o prazo para aumentar suas chances de ser escolhido.
          </Text>

          <Input
            label="Seu Preço (MT)"
            placeholder="Ex: 2000"
            value={price}
            onChangeText={setPrice}
            icon="cash-outline"
            keyboardType="numeric"
          />

          <Input
            label="Prazo (em dias)"
            placeholder="Ex: 3"
            value={deadlineDays}
            onChangeText={setDeadlineDays}
            icon="time-outline"
            keyboardType="numeric"
          />

          <Input
            label="Mensagem para o Cliente"
            placeholder="Explique por que você é a melhor escolha para esta tarefa..."
            value={message}
            onChangeText={setMessage}
            icon="chatbubble-outline"
            multiline={true}
            numberOfLines={5}
          />

          <View style={styles.buttonContainer}>
            <Button
              title="Enviar Proposta"
              onPress={handleSubmitProposal}
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.lg },
  introText: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24, marginBottom: spacing.sm },
  buttonContainer: { marginTop: spacing.md },
});