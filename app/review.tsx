// app/review.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'; // ✅ ActivityIndicator adicionado
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Task } from '../lib/supabase';
import { PaySuiteService, WalletService } from '../lib/paysuite';
import { NotificationService } from '../lib/notifications';

export default function ReviewScreen() {
  const router = useRouter();
  const { taskId, reviewedId, reviewedName } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [task, setTask] = useState<Task | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    if (taskId) fetchTaskDetails(); 
  }, [taskId]);

  const fetchTaskDetails = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, client_id, is_recurring, recurrence_interval, end_date')
      .eq('id', taskId)
      .single();
      
    if (error) { 
      Alert.alert('Erro', 'Tarefa não encontrada'); 
      router.replace('/(tabs)'); 
    } else { 
      setTask(data); 
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) { 
      Alert.alert('Atenção', 'Por favor, selecione uma avaliação (estrelas).'); 
      return; 
    }
    if (!user || !task) { 
      Alert.alert('Erro', 'Utilizador ou tarefa não encontrados.'); 
      return; 
    }

    setLoading(true);
    
    const { error: reviewError } = await supabase.from('reviews').insert({
      task_id: taskId, 
      reviewer_id: user.id, 
      reviewed_id: reviewedId, 
      rating, 
      comment: comment.trim() || null,
    });

    if (reviewError) {
      Alert.alert('Erro', 'Não foi possível enviar: ' + reviewError.message);
      setLoading(false);
    } else {
      const { data: escrow } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('task_id', taskId)
        .eq('status', 'held')
        .single();

      if (escrow) {
        try {
          await PaySuiteService.releaseEscrow(escrow.id);
          await supabase.from('escrow_payments').update({ 
            status: 'released', 
            released_at: new Date().toISOString() 
          }).eq('id', escrow.id);
          
          await WalletService.creditWallet(
            escrow.worker_id, 
            escrow.amount, 
            `Pagamento liberado: ${task.title}`
          );
          
          await NotificationService.createNotification(
            reviewedId as string, 
            'task_approved', 
            'Nova Avaliação Recebida! ⭐',
            `Recebeste uma nova avaliação no NexWork. O teu Trust Score foi atualizado!`, 
            String(taskId), 
            'task'
          );

          // ✅ LÓGICA DE RESET PARA TAREFAS RECORRENTES
          if (task.is_recurring && task.recurrence_interval && task.end_date) {
            const today = new Date();
            const endDate = new Date(task.end_date);
            
            if (today < endDate) {
              const nextDate = new Date(today);
              
              if (task.recurrence_interval === 'daily') {
                nextDate.setDate(today.getDate() + 1);
              } else if (task.recurrence_interval === 'weekly') {
                nextDate.setDate(today.getDate() + 7);
              } else if (task.recurrence_interval === 'monthly') {
                nextDate.setMonth(today.getMonth() + 1);
              }

              if (nextDate <= endDate) {
                const nextDateStr = nextDate.toISOString().split('T')[0];

                await supabase.from('tasks').update({
                  status: 'open',
                  next_occurrence_date: nextDateStr
                }).eq('id', task.id);

                await NotificationService.createNotification(
                  task.client_id,
                  'escrow_reminder', // ✅ Agora o TypeScript aceita isto
                  '💰 Lembrete de Tarefa Recorrente',
                  `A sua tarefa "${task.title}" está agendada para ocorrer novamente em ${nextDate.toLocaleDateString('pt-MZ')}. Por favor, reabasteça o Escrow.`,
                  task.id,
                  'task'
                );
              }
            }
          }

        } catch (err) { 
          console.error('Erro crítico ao processar pagamento/recorrência:', err); 
        }
      }

      Alert.alert(
        'Sucesso! 🎉', 
        'Avaliação enviada e pagamento liberado com sucesso.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
        { cancelable: false }
      );
      setLoading(false);
    }
  };

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text.secondary, marginTop: 16 }}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Avaliar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={[styles.introText, { color: colors.text.secondary }]}>
            Como foi sua experiência com <Text style={[styles.reviewedName, { color: colors.primary }]}>{reviewedName}</Text> na tarefa "{task.title}"?
          </Text>

          <Text style={[styles.label, { color: colors.text.primary }]}>Sua Avaliação</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton} activeOpacity={0.7}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={44}
                  color={star <= rating ? colors.warning : colors.text.light}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.ratingText, { color: colors.text.secondary }]}>
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
            <Button title="Enviar Avaliação" onPress={handleSubmitReview} variant="primary" size="large" fullWidth loading={loading} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  form: { gap: 24 },
  introText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  reviewedName: { fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  starButton: { padding: 4 },
  ratingText: { fontSize: 16, textAlign: 'center', fontWeight: '600', height: 24 },
  buttonContainer: { marginTop: 16 },
});