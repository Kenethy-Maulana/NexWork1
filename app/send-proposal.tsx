// app/send-proposal.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SuccessModal } from '../components/ui/SuccessModal'; // ✅ ADICIONADO
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';

export default function SendProposalScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [price, setPrice] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // ✅ ADICIONADO

  const handleSubmitProposal = async () => {
    if (!price || !deadlineDays || !message) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }
    if (!user) {
      Alert.alert('Atenção', 'Precisa de estar autenticado.');
      return;
    }

    setLoading(true);
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
      Alert.alert('Erro', 'Não foi possível enviar a proposta.');
    } else {
      if (taskData) {
        await NotificationService.createNotification(
          taskData.client_id,
          'new_proposal',
          'Nova Proposta Recebida! 📩',
          `Um trabalhador enviou uma proposta de ${parseFloat(price.replace(',', '.')).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })} para "${taskData.title}".`,
          String(taskId),
          'task'
        );
      }
      setShowSuccess(true); // ✅ SUBSTITUIU O ALERT
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Enviar Proposta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={[styles.tipCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.text.primary }]}>
              Seja claro e profissional. Propostas com preços justos e prazos realistas têm 3x mais chances de ser aceites.
            </Text>
          </View>

          <Input label="Seu Preço (MT)" placeholder="Ex: 2000" value={price} onChangeText={setPrice} icon="cash-outline" keyboardType="numeric" />
          <Input label="Prazo (em dias)" placeholder="Ex: 3" value={deadlineDays} onChangeText={setDeadlineDays} icon="time-outline" keyboardType="numeric" />
          <Input label="Mensagem para o Cliente" placeholder="Explique por que é a melhor escolha..." value={message} onChangeText={setMessage} icon="chatbubble-outline" multiline numberOfLines={5} />

          <View style={styles.buttonContainer}>
            <Button title="Enviar Proposta" onPress={handleSubmitProposal} variant="primary" size="large" fullWidth loading={loading} />
          </View>
        </View>
      </ScrollView>

      {/* ✅ MODAL DE SUCESSO */}
      <SuccessModal 
        visible={showSuccess} 
        title="Proposta Enviada! 🚀" 
        message="O cliente foi notificado e irá analisar a tua proposta em breve. Boa sorte!" 
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  form: { gap: 20 },
  tipCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  buttonContainer: { marginTop: 12 },
});