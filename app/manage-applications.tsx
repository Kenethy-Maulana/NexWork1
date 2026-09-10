// app/manage-applications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { SuccessModal } from '../components/ui/SuccessModal'; // ✅ ADICIONADO
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ManageApplicationsScreen() {
  const router = useRouter();
  const { vacancyId } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [vacancy, setVacancy] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'interview' | 'approved' | 'rejected'>('all');
  
  // ✅ ESTADOS PARA O MODAL DINÂMICO
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (vacancyId) { fetchVacancy(); fetchApplications(); }
  }, [vacancyId]);

  const fetchVacancy = async () => {
    const { data } = await supabase.from('job_vacancies').select('*').eq('id', vacancyId).single();
    setVacancy(data);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase.from('job_applications').select(`*, candidate:profiles!candidate_id(full_name, company_name, avatar_url, user_type, trust_score, level, bio, location), documents:job_documents(*)`).eq('vacancy_id', vacancyId).order('applied_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data, error } = await query;
      if (!error && data) setApplications(data);
    } catch (err) { console.error('Erro:', err); } 
    finally { setLoading(false); }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from('job_applications').update({ status: newStatus }).eq('id', appId);
    if (error) {
      Alert.alert('Erro', 'Erro ao atualizar: ' + error.message);
    } else {
      if (newStatus === 'rejected') {
        Alert.alert('Candidatura Rejeitada'); // Alert simples para ação negativa
      } else {
        setSuccessMessage(newStatus === 'approved' ? 'Candidato aprovado com sucesso!' : 'Candidatura atualizada!');
        setShowSuccess(true); // Modal para ação positiva
      }
      fetchApplications();
    }
  };

  const scheduleInterview = async (appId: string, type: 'online' | 'in_person') => {
    const dateStr = prompt('Digite a data e hora da entrevista (ex: 2025-08-15 10:00):');
    if (!dateStr) return;
    const location = type === 'in_person' ? prompt('Digite o local da entrevista:') : null;
    const { error } = await supabase.from('job_interviews').insert({
      application_id: appId, interview_type: type, scheduled_at: new Date(dateStr).toISOString(),
      duration_minutes: 30, location: location || null, meeting_link: type === 'online' ? `https://meet.jit.si/NexWork-${appId}` : null, status: 'scheduled',
    });
    if (error) {
      Alert.alert('Erro', 'Erro ao agendar: ' + error.message);
    } else { 
      await updateStatus(appId, 'interview'); 
      setSuccessMessage('Entrevista agendada com sucesso!');
      setShowSuccess(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning + '20';
      case 'reviewed': return colors.primary + '20';
      case 'interview': return colors.primary + '20';
      case 'approved': return colors.success + '20';
      case 'rejected': return colors.error + '20';
      default: return colors.surfaceLight;
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

  const filteredApplications = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const renderApplication = ({ item }: { item: any }) => {
    const candidateName = item.candidate?.user_type === 'company' ? item.candidate?.company_name : item.candidate?.full_name || 'Candidato';
    const docCount = item.documents?.length || 0;
    const statusBg = getStatusColor(item.status);

    return (
      <View style={[styles.appCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.appHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.candidateName, { color: colors.text.primary }]}>{candidateName}</Text>
            <View style={styles.metaRow}>
              {item.candidate?.trust_score && <Text style={[styles.metaText, { color: colors.text.secondary }]}>⭐ {item.candidate.trust_score}</Text>}
              {item.candidate?.location && <Text style={[styles.metaText, { color: colors.text.secondary }]}>📍 {item.candidate.location}</Text>}
              <Text style={[styles.metaText, { color: colors.text.secondary }]}>📄 {docCount} docs</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: colors.text.primary }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {item.cover_letter && <Text style={[styles.coverLetter, { color: colors.text.secondary }]} numberOfLines={3}>"{item.cover_letter}"</Text>}

        {item.expected_salary && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={colors.success} />
            <Text style={[styles.salaryText, { color: colors.success }]}>Pretensão: {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(item.expected_salary)}</Text>
          </View>
        )}

        {docCount > 0 && (
          <View style={styles.docsRow}>
            {item.documents.map((doc: any) => (
              <View key={doc.id} style={[styles.docChip, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="document" size={12} color={colors.primary} />
                <Text style={[styles.docChipText, { color: colors.primary }]}>{doc.document_type.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        )}

        {(item.status === 'pending' || item.status === 'reviewed') && (
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            <Button title="Rejeitar" onPress={() => updateStatus(item.id, 'rejected')} variant="outline" size="small" />
            <Button title="Agendar Entrevista" onPress={() => { const type = window.confirm('Entrevista Online?\n\nOK = Online\nCancelar = Presencial') ? 'online' : 'in_person'; scheduleInterview(item.id, type); }} variant="outline" size="small" />
            <Button title="Aprovar" onPress={() => updateStatus(item.id, 'approved')} variant="primary" size="small" />
          </View>
        )}

        {item.status === 'interview' && (
          <View style={[styles.interviewBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Ionicons name="videocam" size={16} color={colors.primary} />
            <Text style={[styles.interviewText, { color: colors.primary }]}>Entrevista agendada</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><View style={styles.loadingContainer}><Text style={{ color: colors.text.secondary }}>Carregando candidaturas...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>Candidaturas{vacancy ? ` - ${vacancy.title}` : ''}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filtersScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.filtersRow}>
          {(['all', 'pending', 'interview', 'approved', 'rejected'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { borderColor: filter === f ? colors.primary : colors.border, backgroundColor: filter === f ? colors.primary : 'transparent' }]}
              onPress={() => { setFilter(f); fetchApplications(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : colors.text.secondary, fontWeight: filter === f ? '600' : '500' }]}>
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
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhuma candidatura encontrada</Text>
          </View>
        }
      />

      {/* ✅ MODAL DE SUCESSO DINÂMICO */}
      <SuccessModal 
        visible={showSuccess} 
        title="Sucesso! ✅" 
        message={successMessage} 
        onClose={() => setShowSuccess(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 32 },
  filtersScroll: { borderBottomWidth: 1 },
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  listContent: { padding: 20, paddingBottom: 40 },
  appCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  candidateName: { fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metaText: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  coverLetter: { fontSize: 14, fontStyle: 'italic', lineHeight: 20, marginBottom: 12 },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  salaryText: { fontSize: 14, fontWeight: '600' },
  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  docChipText: { fontSize: 11, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 12 },
  interviewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  interviewText: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },
});