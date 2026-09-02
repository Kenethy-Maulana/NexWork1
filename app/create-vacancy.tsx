// app/create-vacancy.tsx
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

  const handleCreate = async () => {
    if (!title || !description || !location) {
      alert('Preencha título, descrição e localização.');
      return;
    }

    if (!user) {
      alert('Você precisa estar logado.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('job_vacancies').insert({
        employer_id: user.id,
        title,
        description,
        requirements: requirements.split('\n').filter(r => r.trim()),
        benefits: benefits.split('\n').filter(b => b.trim()),
        job_type: jobType,
        experience_level: experienceLevel,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        location,
        is_remote: isRemote,
        vacancies_count: parseInt(vacanciesCount) || 1,
        deadline: deadline || null,
        status: 'open',
      });

      if (error) throw error;

      alert('✅ Vaga criada com sucesso! Candidatos podem aplicar agora.');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Erro ao criar vaga:', err);
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Vaga</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input 
            label="Título da Vaga *" 
            placeholder="Ex: Desenvolvedor Full Stack" 
            value={title} 
            onChangeText={setTitle} 
            icon="briefcase-outline" 
          />

          <Input 
            label="Descrição Detalhada *" 
            placeholder="Descreva a vaga, responsabilidades, objetivos..." 
            value={description} 
            onChangeText={setDescription} 
            icon="text-outline" 
            multiline
            numberOfLines={5}
          />

          <Input 
            label="Requisitos (um por linha)" 
            placeholder="Ex: Experiência com React&#10;Conhecimento em Node.js&#10;Inglês intermediário" 
            value={requirements} 
            onChangeText={setRequirements} 
            icon="checkmark-circle-outline" 
            multiline
            numberOfLines={4}
          />

          <Input 
            label="Benefícios (um por linha)" 
            placeholder="Ex: Vale transporte&#10;Plano de saúde&#10;Home office" 
            value={benefits} 
            onChangeText={setBenefits} 
            icon="gift-outline" 
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Tipo de Contrato</Text>
          <View style={styles.optionsRow}>
            {JOB_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.optionChip, jobType === type.id && styles.optionChipActive]}
                onPress={() => setJobType(type.id as any)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={16} 
                  color={jobType === type.id ? colors.surface : colors.text.secondary} 
                />
                <Text style={[styles.optionText, jobType === type.id && styles.optionTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Nível de Experiência</Text>
          <View style={styles.optionsRow}>
            {EXPERIENCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.optionChip, experienceLevel === level.id && styles.optionChipActive]}
                onPress={() => setExperienceLevel(level.id as any)}
              >
                <Text style={[styles.optionText, experienceLevel === level.id && styles.optionTextActive]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.salaryRow}>
            <View style={{ flex: 1 }}>
              <Input 
                label="Salário Mínimo (MT)" 
                placeholder="Ex: 30000" 
                value={salaryMin} 
                onChangeText={setSalaryMin} 
                icon="trending-down-outline" 
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input 
                label="Salário Máximo (MT)" 
                placeholder="Ex: 50000" 
                value={salaryMax} 
                onChangeText={setSalaryMax} 
                icon="trending-up-outline" 
                keyboardType="numeric"
              />
            </View>
          </View>

          <Input 
            label="Localização *" 
            placeholder="Ex: Maputo, Moçambique" 
            value={location} 
            onChangeText={setLocation} 
            icon="location-outline" 
          />

          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setIsRemote(!isRemote)}
          >
            <View style={[styles.checkbox, isRemote && styles.checkboxActive]}>
              {isRemote && <Ionicons name="checkmark" size={16} color={colors.surface} />}
            </View>
            <Text style={styles.checkboxLabel}>Esta vaga permite trabalho remoto</Text>
          </TouchableOpacity>

          <Input 
            label="Número de Vagas" 
            placeholder="1" 
            value={vacanciesCount} 
            onChangeText={setVacanciesCount} 
            icon="people-outline" 
            keyboardType="numeric"
          />

          <Text style={styles.label}>Data Limite para Candidaturas</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {deadline || 'Selecionar data limite (opcional)'}
            </Text>
          </TouchableOpacity>
          {showCalendar && (
            <View style={styles.calendarContainer}>
              <Calendar 
                selectedDate={deadline} 
                onDateSelect={(date) => {
                  setDeadline(date);
                  setShowCalendar(false);
                }}
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button 
              title="Publicar Vaga" 
              onPress={handleCreate} 
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
  form: { gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  optionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.xs },
  optionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '500' },
  optionTextActive: { color: colors.surface, fontWeight: '600' },
  salaryRow: { flexDirection: 'row', gap: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: fontSize.md, color: colors.text.primary, flex: 1 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  dateButtonText: { fontSize: fontSize.md, color: colors.text.primary },
  calendarContainer: { marginTop: spacing.sm },
  buttonContainer: { marginTop: spacing.lg },
});