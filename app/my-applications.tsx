// app/my-applications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function MyApplicationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`*, vacancy:job_vacancies!vacancy_id(title, location, employer_id), interview:job_interviews!application_id(id, interview_type, scheduled_at, meeting_link, location, status)`)
        .eq('candidate_id', user?.id)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (err) { console.error('Erro:', err); } 
    finally { setLoading(false); }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: colors.warning + '20', text: colors.warning };
      case 'reviewed': return { bg: colors.primary + '20', text: colors.primary };
      case 'interview': return { bg: colors.primary + '20', text: colors.primary };
      case 'approved': return { bg: colors.success + '20', text: colors.success };
      case 'rejected': return { bg: colors.error + '20', text: colors.error };
      default: return { bg: colors.surfaceLight, text: colors.text.secondary };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Em Análise';
      case 'reviewed': return 'Analisada';
      case 'interview': return 'Entrevista Agendada';
      case 'approved': return 'Aprovado(a)';
      case 'rejected': return 'Não Selecionado(a)';
      default: return status;
    }
  };

  const handleJoinInterview = (meetingLink: string) => Linking.openURL(meetingLink);

  const renderApplication = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const hasInterview = item.interview && item.interview.length > 0;
    const activeInterview = hasInterview ? item.interview[0] : null;
    const isOnlineInterview = activeInterview?.interview_type === 'online' && activeInterview?.status === 'scheduled';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.vacancyTitle, { color: colors.text.primary }]}>{item.vacancy?.title || 'Vaga'}</Text>
            <Text style={[styles.location, { color: colors.text.secondary }]}>📍 {item.vacancy?.location}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {activeInterview && (
          <View style={[styles.interviewBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Ionicons name={activeInterview.interview_type === 'online' ? 'videocam' : 'location'} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.interviewTitle, { color: colors.primary }]}>
                {activeInterview.interview_type === 'online' ? 'Entrevista Online' : 'Entrevista Presencial'}
              </Text>
              <Text style={[styles.interviewDetail, { color: colors.text.secondary }]}>
                {new Date(activeInterview.scheduled_at).toLocaleString('pt-MZ')}
              </Text>
              {activeInterview.interview_type === 'in_person' && activeInterview.location && (
                <Text style={[styles.interviewDetail, { color: colors.text.secondary }]}>Local: {activeInterview.location}</Text>
              )}
            </View>
          </View>
        )}

        {isOnlineInterview && activeInterview?.meeting_link && (
          <Button title="🎥 Entrar na Sala" onPress={() => handleJoinInterview(activeInterview.meeting_link)} variant="primary" size="medium" fullWidth />
        )}

        {item.status === 'rejected' && (
          <Text style={[styles.rejectedText, { color: colors.error }]}>Infelizmente, não avançámos com a tua candidatura desta vez.</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><View style={styles.loadingContainer}><Text style={{ color: colors.text.secondary }}>Carregando...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Minhas Candidaturas</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>Ainda não te candidataste a nenhuma vaga.</Text>
            <Button title="Ver Vagas Disponíveis" onPress={() => router.push('/vacancies')} variant="primary" size="medium" />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  listContent: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  vacancyTitle: { fontSize: 16, fontWeight: '700' },
  location: { fontSize: 14, marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  interviewBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  interviewTitle: { fontSize: 14, fontWeight: '700' },
  interviewDetail: { fontSize: 12, marginTop: 4 },
  rejectedText: { fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 16, marginBottom: 24, textAlign: 'center', fontWeight: '500' },
});