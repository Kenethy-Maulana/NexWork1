// app/review.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Task } from '../lib/supabase';
import { PaySuiteService, WalletService } from '../lib/paysuite';
import { NotificationService } from '../lib/notifications'; // <-- ADICIONADO

export default function ReviewScreen() {
  const router = useRouter();
  const { taskId, reviewedId, reviewedName } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (error) {
      alert('Tarefa não encontrada');
      router.replace('/(tabs)');
    } else {
      setTask(data);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert('Por favor, selecione uma avaliação (estrelas).');
      return;
    }

    if (!user || !task) {
      alert('Erro: Utilizador ou tarefa não encontrados.');
      return;
    }

    setLoading(true);

    // 1. Salvar a avaliação
    const { error } = await supabase.from('reviews').insert({
      task_id: taskId,
      reviewer_id: user.id,
      reviewed_id: reviewedId,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      console.error('❌ Erro ao enviar avaliação:', error);
      alert('Não foi possível enviar: ' + error.message);
      setLoading(false);
    } else {
      console.log('✅ Avaliação enviada com sucesso. A verificar Escrow...');
      
      // 2. Verificar se existe dinheiro bloqueado (Escrow) para esta tarefa
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('task_id', taskId)
        .eq('status', 'held')
        .single();

      if (escrowError || !escrow) {
        console.log('ℹ️ Nenhum Escrow encontrado para esta tarefa (tarefa sem pagamento bloqueado).');
      } else {
        console.log('💰 Escrow encontrado! Valor: ', escrow.amount, 'A liberar fundos para o trabalhador ID:', escrow.worker_id);
        try {
          // 3. Simular liberação no PaySuite
          await PaySuiteService.releaseEscrow(escrow.id);
          console.log('🔓 PaySuite: Escrow liberado.');
          
          // 4. Atualizar status no banco de dados
          await supabase
            .from('escrow_payments')
            .update({ status: 'released', released_at: new Date().toISOString() })
            .eq('id', escrow.id);
          console.log('🗄️ Banco de dados: Status do Escrow atualizado para "released".');

          // 5. Creditar o dinheiro na carteira do trabalhador
          await WalletService.creditWallet(
            escrow.worker_id,
            escrow.amount,
            `Pagamento liberado: ${task.title}`
          );
          console.log('💵 Carteira: Fundos creditados com sucesso na carteira do trabalhador!');
          
          // 🔔 NOTIFICAÇÃO: Avisar a outra parte que foi avaliada
          await NotificationService.createNotification(
            reviewedId as string,
            'task_approved',
            'Nova Avaliação Recebida! ⭐',
            `Recebeste uma nova avaliação no NexWork. O teu Trust Score foi atualizado!`,
            String(taskId),
            'task'
          );
          
        } catch (err) {
          console.error('❌ Erro crítico ao liberar escrow:', err);
        }
      }

      alert('✅ Avaliação enviada com sucesso! O Trust Score foi atualizado e o pagamento foi liberado.');
      router.replace('/(tabs)');
    }
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avaliar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.introText}>
            Como foi sua experiência com <Text style={styles.reviewedName}>{reviewedName}</Text> na tarefa "{task.title}"?
          </Text>

          <Text style={styles.label}>Sua Avaliação</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#FFD700' : colors.text.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingText}>
            {rating === 0 && 'Selecione uma avaliação'}
            {rating === 1 && 'Muito ruim'}
            {rating === 2 && 'Ruim'}
            {rating === 3 && 'Regular'}
            {rating === 4 && 'Bom'}
            {rating === 5 && 'Excelente'}
          </Text>

          <Input
            label="Comentário (opcional)"
            placeholder="Conte como foi sua experiência..."
            value={comment}
            onChangeText={setComment}
            icon="chatbubble-outline"
            multiline={true}
            numberOfLines={4}
          />

          <View style={styles.buttonContainer}>
            <Button
              title="Enviar Avaliação"
              onPress={handleSubmitReview}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.lg },
  introText: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24, marginBottom: spacing.sm },
  reviewedName: { fontWeight: '700', color: colors.primary },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  starButton: { padding: spacing.xs },
  ratingText: { fontSize: fontSize.md, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg, fontWeight: '600' },
  buttonContainer: { marginTop: spacing.md },
});