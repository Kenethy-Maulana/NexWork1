// app/task-details.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Task } from '../lib/supabase';

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      // 1. Tenta buscar com o join (relação com profiles)
      let { data, error } = await supabase
        .from('tasks')
        .select(`*, client:profiles!client_id(full_name, company_name, avatar_url, user_type)`)
        .eq('id', id)
        .single();

      // 2. ✅ PLANO B: Se falhar por causa da relação (PGRST200), busca apenas os dados da tarefa
      if (error && error.code === 'PGRST200') {
        console.warn('Relação não encontrada no Supabase. Buscando dados básicos da tarefa...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!fallbackError && fallbackData) {
          data = fallbackData;
        } else {
          throw fallbackError;
        }
      }

      if (error || !data) {
        Alert.alert('Erro', 'Tarefa não encontrada.');
        router.back();
        return;
      }

      setTask(data);
    } catch (err) {
      console.error('Erro inesperado:', err);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = { 
      eletrica: '⚡ Elétrica', encanamento: '💧 Encanamento', pintura: '🎨 Pintura',
      limpeza: '🧹 Limpeza', mudancas: '📦 Mudanças', ti: '💻 TI', outros: '📋 Outros'
    };
    return labels[category] || '📋 Outros';
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
    return labels[freq] || freq;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) return null;

  // Se o join falhou, 'client' será undefined. Usamos um fallback.
  const clientName = task.client?.user_type === 'company' 
    ? task.client?.company_name 
    : task.client?.full_name || 'Cliente';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Detalhes da Tarefa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner de Tarefa Recorrente (se aplicável) */}
        {task.is_recurring && (
          <View style={[styles.recurringBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Ionicons name="repeat" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.recurringText, { color: colors.primary, fontWeight: '700' }]}>
                Tarefa Recorrente ({getFrequencyLabel(task.recurrence_interval)})
              </Text>
              {task.end_date && (
                <Text style={[styles.recurringSubtext, { color: colors.text.secondary }]}>
                  Válido até: {new Date(task.end_date).toLocaleDateString('pt-MZ')}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>{task.title}</Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>{getCategoryLabel(task.category)}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="cash-outline" size={14} color={colors.success} />
              <Text style={[styles.metaText, { color: colors.success }]}>{formatCurrency(task.budget)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Descrição</Text>
            <Text style={[styles.description, { color: colors.text.secondary }]}>{task.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Localização</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.text.secondary }]}>{task.location || task.location_name}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Publicado por</Text>
            <View style={styles.clientRow}>
              <View style={[styles.clientAvatar, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.clientName, { color: colors.text.primary }]}>{clientName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            title="Enviar Proposta" 
            onPress={() => router.push({ pathname: '/send-proposal', params: { taskId: task.id } })} 
            variant="primary" 
            size="large" 
            fullWidth 
          />
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  recurringBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  recurringText: { fontSize: 14 },
  recurringSubtext: { fontSize: 13, marginTop: 2 },
  
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16, lineHeight: 28 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  metaText: { fontSize: 13, fontWeight: '600' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { fontSize: 15, flex: 1 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 15, fontWeight: '600' },
  buttonContainer: { marginTop: 8 },
});