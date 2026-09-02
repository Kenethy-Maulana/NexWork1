// app/hire-worker.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';

const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function HireWorkerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Profile | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableWorkers();
  }, []);

  const fetchAvailableWorkers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id)
      .eq('is_available_now', true)
      .order('trust_score', { ascending: false });

    if (!error && data) setWorkers(data);
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedWorker || !jobTitle || !monthlySalary || !startDate || selectedDays.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios e selecione pelo menos um dia.');
      return;
    }

    if (!user) {
      alert('Você precisa estar logado.');
      return;
    }

    setLoading(true);

    try {
      const workingHours = `${selectedDays.join(', ')} | ${startTime || '08:00'} às ${endTime || '17:00'}`;

      const { error } = await supabase.from('contracts').insert({
        employer_id: user.id,
        worker_id: selectedWorker.id,
        job_title: jobTitle,
        description: description.trim() || null,
        monthly_salary: parseFloat(monthlySalary.replace(',', '.')),
        start_date: startDate,
        working_hours: workingHours,
        status: 'pending', // Status pendente, aguardando o trabalhador aceitar
      });

      if (error) throw error;

      alert('✅ Oferta enviada com sucesso! O trabalhador será notificado e poderá aceitar ou recusar.');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Erro ao enviar oferta:', err);
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderWorker = ({ item }: { item: Profile }) => {
    const name = item.user_type === 'company' ? item.company_name : item.full_name;
    const isSelected = selectedWorker?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.workerCard, isSelected && styles.workerCardSelected]}
        onPress={() => setSelectedWorker(item)}
      >
        <View style={styles.workerHeader}>
          <View style={styles.workerAvatar}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName}>{name || 'Trabalhador'}</Text>
            <View style={styles.workerMeta}>
              <Text style={styles.workerLevel}>{item.level}</Text>
              <Text style={styles.workerScore}>⭐ {item.trust_score}</Text>
            </View>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
        </View>
        {item.bio && <Text style={styles.workerBio} numberOfLines={2}>{item.bio}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Oferta Direta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Trabalhadores Disponíveis</Text>
        <Text style={styles.helperText}>
          Envie uma oferta direta. O trabalhador poderá analisar os detalhes e decidir se aceita ou recusa.
        </Text>
        
        <FlatList
          data={workers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorker}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyWorkers}>
              <Ionicons name="people-outline" size={48} color={colors.text.light} />
              <Text style={styles.emptyText}>Nenhum trabalhador disponível no momento</Text>
            </View>
          }
        />

        {selectedWorker && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Detalhes da Oferta</Text>

            <Input label="Cargo / Função" placeholder="Ex: Eletricista" value={jobTitle} onChangeText={setJobTitle} icon="briefcase-outline" />
            <Input label="Descrição (opcional)" placeholder="Descreva as responsabilidades..." value={description} onChangeText={setDescription} icon="text-outline" multiline numberOfLines={3} />
            <Input label="Salário Mensal (MT)" placeholder="Ex: 15000" value={monthlySalary} onChangeText={setMonthlySalary} icon="cash-outline" keyboardType="numeric" />

            <Text style={styles.label}>Dias de Trabalho *</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Input label="Hora Início" placeholder="08:00" value={startTime} onChangeText={setStartTime} icon="time-outline" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Hora Fim" placeholder="17:00" value={endTime} onChangeText={setEndTime} icon="time-outline" keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Data de Início *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowCalendar(!showCalendar)}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.dateButtonText}>{startDate || 'Selecionar data de início'}</Text>
            </TouchableOpacity>
            {showCalendar && (
              <View style={styles.calendarContainer}>
                <Calendar selectedDate={startDate} onDateSelect={(date) => { setStartDate(date); setShowCalendar(false); }} />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Button title="Enviar Oferta ao Trabalhador" onPress={handleSendOffer} variant="primary" size="large" fullWidth loading={loading} />
            </View>
          </View>
        )}
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
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  helperText: { fontSize: fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  workerCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  workerCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  workerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  workerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  workerMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  workerLevel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  workerScore: { fontSize: fontSize.xs, color: colors.text.secondary },
  workerBio: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.sm, lineHeight: 20 },
  emptyWorkers: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
  form: { marginTop: spacing.xl, gap: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '600' },
  dayTextActive: { color: colors.surface, fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  dateButtonText: { fontSize: fontSize.md, color: colors.text.primary },
  calendarContainer: { marginTop: spacing.sm },
  buttonContainer: { marginTop: spacing.md },
});