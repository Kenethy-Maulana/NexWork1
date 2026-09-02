// app/manage-applications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ManageApplicationsScreen() {
  const router = useRouter();
  const { vacancyId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [vacancy, setVacancy] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'interview' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (vacancyId) {
      fetchVacancy();
      fetchApplications();
    }
  }, [vacancyId]);

  const fetchVacancy = async () => {
    const { data } = await supabase
      .from('job_vacancies')
      .select('*')
      .eq('id', vacancyId)
      .single();
    setVacancy(data);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('job_applications')
        .select(`
          *,
          candidate:profiles!candidate_id(full_name, company_name, avatar_url, user_type, trust_score, level, bio, location),
          documents:job_documents(*)
        `)
        .eq('vacancy_id', vacancyId)
        .order('applied_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (!error && data) setApplications(data);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status: newStatus })
      .eq('id', appId);

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
    } else {
      alert('✅ Candidatura atualizada!');
      fetchApplications();
    }
  };

  const scheduleInterview = async (appId: string, type: 'online' | 'in_person') => {
    const dateStr = prompt('Digite a data e hora da entrevista (ex: 2025-08-15 10:00):');
    if (!dateStr) return;

    const location = type === 'in_person' 
      ? prompt('Digite o local da entrevista:') 
      : null;

    const { error } = await supabase.from('job_interviews').insert({
      application_id: appId,
      interview_type: type,
      scheduled_at: new Date(dateStr).toISOString(),
      duration_minutes: 30,
      location: location || null,
      meeting_link: type === 'online' ? `https://meet.jit.si/NexWork-${appId}` : null,
      status: 'scheduled',
    });

    if (error) {
      alert('Erro ao agendar: ' + error.message);
    } else {
      // Atualizar status da candidatura para "interview"
      await updateStatus(appId, 'interview');
      alert('✅ Entrevista agendada com sucesso!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FEF3C7';
      case 'reviewed': return '#DBEAFE';
      case 'interview': return '#E0E7FF';
      case 'approved': return '#DCFCE7';
      case 'rejected': return '#FEE2E2';
      default: return colors.surfaceDark;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Nova';
      case 'reviewed': return 'Analisada';
      case 'interview': return 'Entrevista';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      default: return status;
    }
  };

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(a => a.status === filter);

  const renderApplication = ({ item }: { item: any }) => {
    const candidateName = item.candidate?.user_type === 'company'
      ? item.candidate?.company_name
      : item.candidate?.full_name || 'Candidato';

    const docCount = item.documents?.length || 0;

    return (
      <View style={styles.appCard}>
        <View style={styles.appHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.candidateName}>{candidateName}</Text>
            <View style={styles.metaRow}>
              {item.candidate?.trust_score && (
                <Text style={styles.metaText}>⭐ {item.candidate.trust_score}</Text>
              )}
              {item.candidate?.location && (
                <Text style={styles.metaText}>📍 {item.candidate.location}</Text>
              )}
              <Text style={styles.metaText}>📄 {docCount} docs</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {item.cover_letter && (
          <Text style={styles.coverLetter} numberOfLines={3}>
            "{item.cover_letter}"
          </Text>
        )}

        {item.expected_salary && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={colors.success} />
            <Text style={styles.salaryText}>
              Pretensão: {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(item.expected_salary)}
            </Text>
          </View>
        )}

        {/* Documentos anexados */}
        {docCount > 0 && (
          <View style={styles.docsRow}>
            {item.documents.map((doc: any) => (
              <View key={doc.id} style={styles.docChip}>
                <Ionicons name="document" size={12} color={colors.primary} />
                <Text style={styles.docChipText}>{doc.document_type.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Botões de Ação */}
        {(item.status === 'pending' || item.status === 'reviewed') && (
          <View style={styles.actionsRow}>
            <Button 
              title="Rejeitar" 
              onPress={() => updateStatus(item.id, 'rejected')} 
              variant="outline" 
              size="small" 
            />
            <Button 
              title="Agendar Entrevista" 
              onPress={() => {
                const type = window.confirm('Entrevista Online?\n\nOK = Online\nCancelar = Presencial') ? 'online' : 'in_person';
                scheduleInterview(item.id, type);
              }} 
              variant="outline" 
              size="small" 
            />
            <Button 
              title="Aprovar" 
              onPress={() => updateStatus(item.id, 'approved')} 
              variant="primary" 
              size="small" 
            />
          </View>
        )}

        {item.status === 'interview' && (
          <View style={styles.interviewBox}>
            <Ionicons name="videocam" size={16} color={colors.primary} />
            <Text style={styles.interviewText}>Entrevista agendada</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando candidaturas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Candidaturas{vacancy ? ` - ${vacancy.title}` : ''}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersRow}>
          {(['all', 'pending', 'interview', 'approved', 'rejected'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => { setFilter(f); fetchApplications(); }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todas' : getStatusLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>Nenhuma candidatura encontrada</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  filtersScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '500' },
  filterTextActive: { color: colors.surface, fontWeight: '600' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  appCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  candidateName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  metaText: { fontSize: fontSize.xs, color: colors.text.secondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text.primary },
  coverLetter: { fontSize: fontSize.sm, color: colors.text.secondary, fontStyle: 'italic', lineHeight: 20, marginBottom: spacing.sm },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  salaryText: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surfaceDark, borderRadius: borderRadius.full },
  docChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  interviewBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#E0E7FF', padding: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm },
  interviewText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
});