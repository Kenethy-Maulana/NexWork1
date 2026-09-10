// app/create-vacancy.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { SuccessModal } from '../components/ui/SuccessModal'; // ✅ ADICIONADO
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const JOB_TYPES = [
  { id: 'full_time', label: 'Tempo Inteiro', icon: 'briefcase' },
  { id: 'part_time', label: 'Meio Período', icon: 'time' },
  { id: 'contract', label: 'Contrato', icon: 'document-text' },
  { id: 'temporary', label: 'Temporário', icon: 'hourglass' },
];

const EXPERIENCE_LEVELS = [
  { id: 'junior', label: 'Júnior (0-2 anos)' },
  { id: 'mid', label: 'Pleno (2-5 anos)' },
  { id: 'senior', label: 'Sénior (5+ anos)' },
  { id: 'any', label: 'Qualquer nível' },
];

export default function CreateVacancyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [jobType, setJobType] = useState<'full_time' | 'part_time' | 'contract' | 'temporary'>('full_time');
  const [experienceLevel, setExperienceLevel] = useState<'junior' | 'mid' | 'senior' | 'any'>('any');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [vacanciesCount, setVacanciesCount] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false); // ✅ ADICIONADO

  const handleCreate = async () => {
    if (!title || !description || !location) { 
      Alert.alert('Atenção', 'Preencha título, descrição e localização.'); 
      return; 
    }
    if (!user) { 
      Alert.alert('Atenção', 'Você precisa estar logado.'); 
      return; 
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('job_vacancies').insert({
        employer_id: user.id, title, description,
        requirements: requirements.split('\n').filter(r => r.trim()),
        benefits: benefits.split('\n').filter(b => b.trim()),
        job_type: jobType, experience_level: experienceLevel,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        location, is_remote: isRemote,
        vacancies_count: parseInt(vacanciesCount) || 1,
        deadline: deadline || null, status: 'open',
      });
      if (error) throw error;
      
      setShowSuccess(true); // ✅ SUBSTITUIU O ALERT
    } catch (err: any) { 
      Alert.alert('Erro', err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Criar Vaga</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input label="Título da Vaga *" placeholder="Ex: Desenvolvedor Full Stack" value={title} onChangeText={setTitle} icon="briefcase-outline" />
          <Input label="Descrição Detalhada *" placeholder="Descreva a vaga, responsabilidades, objetivos..." value={description} onChangeText={setDescription} icon="text-outline" multiline numberOfLines={5} />
          <Input label="Requisitos (um por linha)" placeholder="Ex: Experiência com React&#10;Conhecimento em Node.js" value={requirements} onChangeText={setRequirements} icon="checkmark-circle-outline" multiline numberOfLines={4} />
          <Input label="Benefícios (um por linha)" placeholder="Ex: Vale transporte&#10;Plano de saúde" value={benefits} onChangeText={setBenefits} icon="gift-outline" multiline numberOfLines={4} />

          <Text style={[styles.label, { color: colors.text.primary }]}>Tipo de Contrato</Text>
          <View style={styles.optionsRow}>
            {JOB_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.optionChip, { backgroundColor: jobType === type.id ? colors.primary : colors.surface, borderColor: jobType === type.id ? colors.primary : colors.border }]}
                onPress={() => setJobType(type.id as any)}
                activeOpacity={0.7}
              >
                <Ionicons name={type.icon as any} size={16} color={jobType === type.id ? '#FFFFFF' : colors.text.secondary} />
                <Text style={[styles.optionText, { color: jobType === type.id ? '#FFFFFF' : colors.text.secondary, fontWeight: jobType === type.id ? '600' : '500' }]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.primary }]}>Nível de Experiência</Text>
          <View style={styles.optionsRow}>
            {EXPERIENCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.optionChip, { backgroundColor: experienceLevel === level.id ? colors.primary : colors.surface, borderColor: experienceLevel === level.id ? colors.primary : colors.border }]}
                onPress={() => setExperienceLevel(level.id as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, { color: experienceLevel === level.id ? '#FFFFFF' : colors.text.secondary, fontWeight: experienceLevel === level.id ? '600' : '500' }]}>{level.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.salaryRow}>
            <View style={{ flex: 1 }}><Input label="Salário Mínimo (MT)" placeholder="Ex: 30000" value={salaryMin} onChangeText={setSalaryMin} icon="trending-down-outline" keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Input label="Salário Máximo (MT)" placeholder="Ex: 50000" value={salaryMax} onChangeText={setSalaryMax} icon="trending-up-outline" keyboardType="numeric" /></View>
          </View>

          <Input label="Localização *" placeholder="Ex: Maputo, Moçambique" value={location} onChangeText={setLocation} icon="location-outline" />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsRemote(!isRemote)} activeOpacity={0.7}>
            <View style={[styles.checkbox, { borderColor: isRemote ? colors.primary : colors.border, backgroundColor: isRemote ? colors.primary : 'transparent' }]}>
              {isRemote && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text.primary }]}>Esta vaga permite trabalho remoto</Text>
          </TouchableOpacity>

          <Input label="Número de Vagas" placeholder="1" value={vacanciesCount} onChangeText={setVacanciesCount} icon="people-outline" keyboardType="numeric" />

          <Text style={[styles.label, { color: colors.text.primary }]}>Data Limite para Candidaturas</Text>
          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowCalendar(!showCalendar)} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: colors.text.primary }]}>{deadline || 'Selecionar data limite (opcional)'}</Text>
          </TouchableOpacity>
          {showCalendar && (
            <View style={styles.calendarContainer}>
              <Calendar selectedDate={deadline} onDateSelect={(date) => { setDeadline(date); setShowCalendar(false); }} />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button title="Publicar Vaga" onPress={handleCreate} variant="primary" size="large" fullWidth loading={loading} />
          </View>
        </View>
      </ScrollView>

      {/* ✅ MODAL DE SUCESSO */}
      <SuccessModal 
        visible={showSuccess} 
        title="Vaga Publicada! 🎉" 
        message="A tua vaga foi criada com sucesso e já está visível para os candidatos." 
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
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 6 },
  optionText: { fontSize: 13 },
  salaryRow: { flexDirection: 'row', gap: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxLabel: { fontSize: 15, flex: 1 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1 },
  dateButtonText: { fontSize: 15, flex: 1 },
  calendarContainer: { marginTop: 8 },
  buttonContainer: { marginTop: 16 },
});