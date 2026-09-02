// app/vacancies.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, JobVacancy } from '../lib/supabase';

export default function VacanciesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'remote' | 'full_time' | 'part_time'>('all');

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('job_vacancies')
        .select(`
          *,
          employer:profiles!employer_id(full_name, company_name, avatar_url, user_type),
          applications:job_applications(count)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Adicionar contagem de candidaturas
      const vacanciesWithCount = (data || []).map((v: any) => ({
        ...v,
        applications_count: v.applications?.[0]?.count || 0,
      }));

      setVacancies(vacanciesWithCount);
    } catch (err) {
      console.error('Erro ao buscar vagas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'A combinar';
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);
  };

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full_time: 'Tempo Inteiro',
      part_time: 'Meio Período',
      contract: 'Contrato',
      temporary: 'Temporário',
    };
    return labels[type] || type;
  };

  const getExperienceLabel = (level: string) => {
    const labels: Record<string, string> = {
      junior: 'Júnior',
      mid: 'Pleno',
      senior: 'Sénior',
      any: 'Qualquer',
    };
    return labels[level] || level;
  };

  const filteredVacancies = vacancies.filter((v) => {
    if (filter === 'remote') return v.is_remote;
    if (filter === 'full_time') return v.job_type === 'full_time';
    if (filter === 'part_time') return v.job_type === 'part_time';
    return true;
  });

  const renderVacancy = ({ item }: { item: any }) => {
    const employerName = item.employer?.user_type === 'company'
      ? item.employer?.company_name
      : item.employer?.full_name || 'Empresa';

    return (
      <TouchableOpacity 
        style={styles.vacancyCard}
        onPress={() => router.push({ pathname: '/vacancy-details', params: { id: item.id } })}
      >
        <View style={styles.vacancyHeader}>
          <View style={styles.employerAvatar}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vacancyTitle}>{item.title}</Text>
            <Text style={styles.employerName}>{employerName}</Text>
          </View>
        </View>

        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Ionicons name="briefcase-outline" size={12} color={colors.primary} />
            <Text style={styles.tagText}>{getJobTypeLabel(item.job_type)}</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="school-outline" size={12} color={colors.primary} />
            <Text style={styles.tagText}>{getExperienceLabel(item.experience_level)}</Text>
          </View>
          {item.is_remote && (
            <View style={[styles.tag, styles.remoteTag]}>
              <Ionicons name="home-outline" size={12} color={colors.success} />
              <Text style={[styles.tagText, { color: colors.success }]}>Remoto</Text>
            </View>
          )}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>

        {(item.salary_min || item.salary_max) && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={colors.success} />
            <Text style={styles.salaryText}>
              {item.salary_min && item.salary_max
                ? `${formatCurrency(item.salary_min)} - ${formatCurrency(item.salary_max)}`
                : item.salary_min
                ? `A partir de ${formatCurrency(item.salary_min)}`
                : `Até ${formatCurrency(item.salary_max)}`}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="people-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.footerText}>{item.applications_count} candidaturas</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="layers-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.footerText}>{item.vacancies_count} vaga(s)</Text>
          </View>
          {item.deadline && (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color={colors.error} />
              <Text style={[styles.footerText, { color: colors.error }]}>
                Até {new Date(item.deadline).toLocaleDateString('pt-MZ')}
              </Text>
            </View>
          )}
        </View>

        {/* Botão Gerir Candidaturas (apenas para o dono da vaga) */}
        {item.employer_id === user?.id && (
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={(e) => {
              e.stopPropagation(); // Impede de abrir os detalhes da vaga ao clicar no botão
              router.push({ pathname: '/manage-applications', params: { vacancyId: item.id } });
            }}
          >
            <Ionicons name="people" size={14} color={colors.surface} />
            <Text style={styles.manageButtonText}>
              Gerir Candidaturas ({item.applications_count})
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* SETA DE VOLTAR ADICIONADA AQUI */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Vagas Disponíveis</Text>
        
        <TouchableOpacity onPress={() => router.push('/create-vacancy')} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'remote' && styles.filterChipActive]}
          onPress={() => setFilter('remote')}
        >
          <Text style={[styles.filterText, filter === 'remote' && styles.filterTextActive]}>Remoto</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'full_time' && styles.filterChipActive]}
          onPress={() => setFilter('full_time')}
        >
          <Text style={[styles.filterText, filter === 'full_time' && styles.filterTextActive]}>Tempo Inteiro</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'part_time' && styles.filterChipActive]}
          onPress={() => setFilter('part_time')}
        >
          <Text style={[styles.filterText, filter === 'part_time' && styles.filterTextActive]}>Meio Período</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredVacancies}
        keyExtractor={(item) => item.id}
        renderItem={renderVacancy}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVacancies(); }} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>Nenhuma vaga disponível no momento</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs }, // ESTILO DA SETA DE VOLTAR
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text.primary },
  addButton: { padding: spacing.xs },
  filtersContainer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '500' },
  filterTextActive: { color: colors.surface, fontWeight: '600' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  vacancyCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vacancyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  employerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  vacancyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  employerName: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.surfaceDark },
  remoteTag: { backgroundColor: '#DCFCE7' },
  tagText: { fontSize: fontSize.xs, color: colors.text.secondary, fontWeight: '600' },
  infoRow: { marginBottom: spacing.sm },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoText: { fontSize: fontSize.sm, color: colors.text.secondary, flex: 1 },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  salaryText: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerText: { fontSize: fontSize.xs, color: colors.text.secondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
  // Estilos novos para o botão de gestão
  manageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.md },
  manageButtonText: { fontSize: fontSize.sm, color: colors.surface, fontWeight: '600' },
});