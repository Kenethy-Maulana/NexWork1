// app/vacancies.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function VacanciesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'remote' | 'full_time' | 'part_time'>('all');

  useEffect(() => { fetchVacancies(); }, []);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('job_vacancies')
        .select(`*, employer:profiles!employer_id(full_name, company_name, avatar_url, user_type), applications:job_applications(count)`)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const vacanciesWithCount = (data || []).map((v: any) => ({
        ...v,
        applications_count: v.applications?.[0]?.count || 0,
      }));
      setVacancies(vacanciesWithCount);
    } catch (err) { console.error('Erro ao buscar vagas:', err); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'A combinar';
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);
  };

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = { full_time: 'Tempo Inteiro', part_time: 'Meio Período', contract: 'Contrato', temporary: 'Temporário' };
    return labels[type] || type;
  };

  const getExperienceLabel = (level: string) => {
    const labels: Record<string, string> = { junior: 'Júnior', mid: 'Pleno', senior: 'Sénior', any: 'Qualquer' };
    return labels[level] || level;
  };

  const filteredVacancies = vacancies.filter((v) => {
    if (filter === 'remote') return v.is_remote;
    if (filter === 'full_time') return v.job_type === 'full_time';
    if (filter === 'part_time') return v.job_type === 'part_time';
    return true;
  });

  const filters = [
    { id: 'all', label: 'Todas' },
    { id: 'remote', label: 'Remoto' },
    { id: 'full_time', label: 'Tempo Inteiro' },
    { id: 'part_time', label: 'Meio Período' },
  ] as const;

  const renderVacancy = ({ item }: { item: any }) => {
    const employerName = item.employer?.user_type === 'company' ? item.employer?.company_name : item.employer?.full_name || 'Empresa';

    return (
      <TouchableOpacity 
        style={[styles.vacancyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/vacancy-details', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.vacancyHeader}>
          <View style={[styles.employerAvatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vacancyTitle, { color: colors.text.primary }]}>{item.title}</Text>
            <Text style={[styles.employerName, { color: colors.text.secondary }]}>{employerName}</Text>
          </View>
        </View>

        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="briefcase-outline" size={12} color={colors.primary} />
            <Text style={[styles.tagText, { color: colors.text.secondary }]}>{getJobTypeLabel(item.job_type)}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="school-outline" size={12} color={colors.primary} />
            <Text style={[styles.tagText, { color: colors.text.secondary }]}>{getExperienceLabel(item.experience_level)}</Text>
          </View>
          {item.is_remote && (
            <View style={[styles.tag, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="home-outline" size={12} color={colors.success} />
              <Text style={[styles.tagText, { color: colors.success }]}>Remoto</Text>
            </View>
          )}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>

        {(item.salary_min || item.salary_max) && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={colors.success} />
            <Text style={[styles.salaryText, { color: colors.success }]}>
              {item.salary_min && item.salary_max
                ? `${formatCurrency(item.salary_min)} - ${formatCurrency(item.salary_max)}`
                : item.salary_min ? `A partir de ${formatCurrency(item.salary_min)}` : `Até ${formatCurrency(item.salary_max)}`}
            </Text>
          </View>
        )}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.footerItem}>
            <Ionicons name="people-outline" size={14} color={colors.text.secondary} />
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>{item.applications_count} candidaturas</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="layers-outline" size={14} color={colors.text.secondary} />
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>{item.vacancies_count} vaga(s)</Text>
          </View>
          {item.deadline && (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color={colors.error} />
              <Text style={[styles.footerText, { color: colors.error }]}>Até {new Date(item.deadline).toLocaleDateString('pt-MZ')}</Text>
            </View>
          )}
        </View>

        {item.employer_id === user?.id && (
          <TouchableOpacity 
            style={[styles.manageButton, { backgroundColor: colors.primary }]}
            onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/manage-applications', params: { vacancyId: item.id } }); }}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={14} color="#FFFFFF" />
            <Text style={styles.manageButtonText}>Gerir Candidaturas ({item.applications_count})</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Vagas Disponíveis</Text>
        <TouchableOpacity onPress={() => router.push('/create-vacancy')} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {filters.map((f) => (
          <TouchableOpacity 
            key={f.id}
            style={[styles.filterChip, { borderColor: filter === f.id ? colors.primary : colors.border, backgroundColor: filter === f.id ? colors.primary : 'transparent' }]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: filter === f.id ? '#FFFFFF' : colors.text.secondary, fontWeight: filter === f.id ? '600' : '500' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredVacancies}
        keyExtractor={(item) => item.id}
        renderItem={renderVacancy}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVacancies(); }} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhuma vaga disponível no momento</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addButton: { padding: 4 },
  filtersContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  listContent: { padding: 20, paddingBottom: 40 },
  vacancyCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vacancyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  employerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vacancyTitle: { fontSize: 17, fontWeight: '700' },
  employerName: { fontSize: 14, marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: '600' },
  infoRow: { marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, flex: 1 },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  salaryText: { fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },
  manageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, marginTop: 12 },
  manageButtonText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
});