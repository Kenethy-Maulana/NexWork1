// app/hire-worker.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { SuccessModal } from '../components/ui/SuccessModal'; // ✅ ADICIONADO
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';

const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function HireWorkerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
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
  const [showSuccess, setShowSuccess] = useState(false); // ✅ ADICIONADO

  useEffect(() => { fetchAvailableWorkers(); }, []);

  const fetchAvailableWorkers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').neq('id', user?.id).eq('is_available_now', true).order('trust_score', { ascending: false });
    if (!error && data) setWorkers(data);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(selectedDays.includes(day) ? selectedDays.filter(d => d !== day) : [...selectedDays, day]);
  };

  const handleSendOffer = async () => {
    if (!selectedWorker || !jobTitle || !monthlySalary || !startDate || selectedDays.length === 0) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios e selecione pelo menos um dia.');
      return;
    }
    if (!user) { Alert.alert('Atenção', 'Você precisa estar logado.'); return; }

    setLoading(true);
    try {
      const workingHours = `${selectedDays.join(', ')} | ${startTime || '08:00'} às ${endTime || '17:00'}`;
      const { error } = await supabase.from('contracts').insert({
        employer_id: user.id, worker_id: selectedWorker.id, job_title: jobTitle,
        description: description.trim() || null,
        monthly_salary: parseFloat(monthlySalary.replace(',', '.')),
        start_date: startDate, working_hours: workingHours, status: 'pending',
      });
      if (error) throw error;
      
      setShowSuccess(true); // ✅ SUBSTITUIU O ALERT
    } catch (err: any) { 
      Alert.alert('Erro', err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const renderWorker = ({ item }: { item: Profile }) => {
    const name = item.user_type === 'company' ? item.company_name : item.full_name;
    const isSelected = selectedWorker?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.workerCard, { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border, borderWidth: isSelected ? 2 : 1 }]}
        onPress={() => setSelectedWorker(item)}
        activeOpacity={0.7}
      >
        <View style={styles.workerHeader}>
          <View style={[styles.workerAvatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.workerName, { color: colors.text.primary }]}>{name || 'Trabalhador'}</Text>
            <View style={styles.workerMeta}>
              <Text style={[styles.workerLevel, { color: colors.primary }]}>{item.level}</Text>
              <Text style={[styles.workerScore, { color: colors.text.secondary }]}>⭐ {item.trust_score}</Text>
            </View>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
        </View>
        {item.bio && <Text style={[styles.workerBio, { color: colors.text.secondary }]} numberOfLines={2}>{item.bio}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Oferta Direta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Trabalhadores Disponíveis</Text>
        <Text style={[styles.helperText, { color: colors.text.secondary }]}>
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
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhum trabalhador disponível no momento</Text>
            </View>
          }
        />

        {selectedWorker && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Detalhes da Oferta</Text>

            <Input label="Cargo / Função" placeholder="Ex: Eletricista" value={jobTitle} onChangeText={setJobTitle} icon="briefcase-outline" />
            <Input label="Descrição (opcional)" placeholder="Descreva as responsabilidades..." value={description} onChangeText={setDescription} icon="text-outline" multiline numberOfLines={3} />
            <Input label="Salário Mensal (MT)" placeholder="Ex: 15000" value={monthlySalary} onChangeText={setMonthlySalary} icon="cash-outline" keyboardType="numeric" />

            <Text style={[styles.label, { color: colors.text.primary }]}>Dias de Trabalho *</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayText, { color: isSelected ? '#FFFFFF' : colors.text.secondary, fontWeight: isSelected ? '600' : '600' }]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}><Input label="Hora Início" placeholder="08:00" value={startTime} onChangeText={setStartTime} icon="time-outline" keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><Input label="Hora Fim" placeholder="17:00" value={endTime} onChangeText={setEndTime} icon="time-outline" keyboardType="numeric" /></View>
            </View>

            <Text style={[styles.label, { color: colors.text.primary }]}>Data de Início *</Text>
            <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowCalendar(!showCalendar)} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.dateButtonText, { color: colors.text.primary }]}>{startDate || 'Selecionar data de início'}</Text>
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

      {/* ✅ MODAL DE SUCESSO */}
      <SuccessModal 
        visible={showSuccess} 
        title="Oferta Enviada! 💼" 
        message="O trabalhador foi notificado e pode aceitar a tua oferta direta a qualquer momento." 
        onClose={() => {
          setShowSuccess(false);
          router.replace('/(tabs)');
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
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  helperText: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  workerCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  workerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: 16, fontWeight: '600' },
  workerMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  workerLevel: { fontSize: 12, fontWeight: '600' },
  workerScore: { fontSize: 12 },
  workerBio: { fontSize: 14, marginTop: 10, lineHeight: 20 },
  emptyWorkers: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, marginTop: 12 },
  form: { marginTop: 24, gap: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  dayText: { fontSize: 13, fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 12 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1 },
  dateButtonText: { fontSize: 15, flex: 1 },
  calendarContainer: { marginTop: 8 },
  buttonContainer: { marginTop: 16 },
});