// app/create-recurring-task.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'eletrica', label: 'Elétrica', icon: 'flash-outline' },
  { id: 'encanamento', label: 'Encanamento', icon: 'water-outline' },
  { id: 'pintura', label: 'Pintura', icon: 'color-palette-outline' },
  { id: 'limpeza', label: 'Limpeza', icon: 'sparkles-outline' },
  { id: 'mudancas', label: 'Mudanças', icon: 'cube-outline' },
  { id: 'ti', label: 'TI / Computadores', icon: 'laptop-outline' },
  { id: 'outros', label: 'Outros', icon: 'construct-outline' },
];

const RECURRENCE_OPTIONS = [
  { id: 'daily', label: 'Diária', description: 'Todos os dias' },
  { id: 'weekly', label: 'Semanal', description: 'Uma vez por semana' },
  { id: 'monthly', label: 'Mensal', description: 'Uma vez por mês' },
];

export default function CreateRecurringTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateTask = async () => {
    if (!title || !description || !category || !location || !budget || !startDate || !endDate) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (!user) {
      alert('Você precisa estar logado.');
      return;
    }

    setLoading(true);

    try {
      const { data: mainTask, error: mainError } = await supabase
        .from('tasks')
        .insert({
          client_id: user.id,
          title,
          description,
          category,
          location,
          budget: parseFloat(budget.replace(',', '.')),
          status: 'open',
          is_recurring: true,
          recurrence_type: recurrenceType,
          recurrence_end_date: endDate,
        })
        .select()
        .single();

      if (mainError) throw mainError;

      const occurrences = generateOccurrences(startDate, endDate, recurrenceType);
      
      for (const occDate of occurrences) {
        await supabase.from('tasks').insert({
          client_id: user.id,
          title: `${title} - ${occDate}`,
          description,
          category,
          location,
          budget: parseFloat(budget.replace(',', '.')),
          status: 'open',
          is_recurring: true,
          recurrence_type: recurrenceType,
          parent_task_id: mainTask.id,
        });
      }

      alert('✅ Tarefa recorrente criada com sucesso!');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Erro ao criar tarefa recorrente:', err);
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateOccurrences = (start: string, end: string, type: string): string[] => {
    const occurrences: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const current = new Date(startDate);

    while (current <= endDate) {
      occurrences.push(current.toISOString().split('T')[0]);
      
      switch (type) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return occurrences;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tarefa Recorrente</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input 
            label="Título da Tarefa" 
            placeholder="Ex: Limpeza do escritório" 
            value={title} 
            onChangeText={setTitle} 
            icon="document-text-outline" 
          />

          <Text style={styles.label}>Categoria do Serviço</Text>
          <View style={styles.categoriesContainer}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={18} 
                    color={isActive ? colors.surface : colors.text.secondary} 
                  />
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input 
            label="Descrição Detalhada" 
            placeholder="Descreva o que precisa ser feito..." 
            value={description} 
            onChangeText={setDescription} 
            icon="text-outline" 
            multiline={true}
            numberOfLines={4}
          />

          <Input 
            label="Localização" 
            placeholder="Ex: Maputo, Bairro Polana" 
            value={location} 
            onChangeText={setLocation} 
            icon="location-outline" 
          />

          <Input 
            label="Orçamento por Ocorrência (MT)" 
            placeholder="Ex: 2500" 
            value={budget} 
            onChangeText={setBudget} 
            icon="cash-outline" 
            keyboardType="numeric" 
          />

          <Text style={styles.label}>Frequência</Text>
          <View style={styles.recurrenceContainer}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.recurrenceOption, recurrenceType === opt.id && styles.recurrenceOptionActive]}
                onPress={() => setRecurrenceType(opt.id as any)}
              >
                <Text style={[styles.recurrenceLabel, recurrenceType === opt.id && styles.recurrenceLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.recurrenceDescription}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Data de Início */}
          <Text style={styles.label}>Data de Início</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              setShowStartCalendar(!showStartCalendar);
              setShowEndCalendar(false);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {startDate || 'Selecionar data de início'}
            </Text>
          </TouchableOpacity>
          {showStartCalendar && (
            <View style={styles.calendarContainer}>
              <Calendar 
                selectedDate={startDate} 
                onDateSelect={(date) => {
                  setStartDate(date);
                  setShowStartCalendar(false);
                }}
              />
            </View>
          )}

          {/* Data de Fim */}
          <Text style={styles.label}>Data de Fim</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              setShowEndCalendar(!showEndCalendar);
              setShowStartCalendar(false);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {endDate || 'Selecionar data de fim'}
            </Text>
          </TouchableOpacity>
          {showEndCalendar && (
            <View style={styles.calendarContainer}>
              <Calendar 
                selectedDate={endDate} 
                onDateSelect={(date) => {
                  setEndDate(date);
                  setShowEndCalendar(false);
                }}
                minDate={startDate}
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button 
              title="Criar Tarefa Recorrente" 
              onPress={handleCreateTask} 
              variant="primary" 
              size="large" 
              fullWidth={true}
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
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.xs },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '500' },
  categoryTextActive: { color: colors.surface, fontWeight: '600' },
  recurrenceContainer: { gap: spacing.sm, marginBottom: spacing.md },
  recurrenceOption: { padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  recurrenceOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  recurrenceLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  recurrenceLabelActive: { color: colors.surface },
  recurrenceDescription: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  dateButtonText: { fontSize: fontSize.md, color: colors.text.primary },
  calendarContainer: { marginTop: spacing.sm },
  buttonContainer: { marginTop: spacing.lg, marginBottom: spacing.xl },
});