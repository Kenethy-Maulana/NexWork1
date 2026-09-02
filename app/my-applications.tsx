// app/my-applications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function MyApplicationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          vacancy:job_vacancies!vacancy_id(title, location, employer_id),
          interview:job_interviews!application_id(id, interview_type, scheduled_at, meeting_link, location, status)
        `)
        .eq('candidate_id', user?.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
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
      case 'pending': return 'Em Análise';
      case 'reviewed': return 'Analisada';
      case 'interview': return 'Entrevista Agendada';
      case 'approved': return 'Aprovado(a)';
      case 'rejected': return 'Não Selecionado(a)';
      default: return status;
    }
  };

  const handleJoinInterview = (meetingLink: string) => {
    Linking.openURL(meetingLink);
  };

  const renderApplication = ({ item }: { item: any }) => {
    const hasInterview = item.interview && item.interview.length > 0;
    const activeInterview = hasInterview ? item.interview[0] : null;
    const isOnlineInterview = activeInterview?.interview_type === 'online' && activeInterview?.status === 'scheduled';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vacancyTitle}>{item.vacancy?.title || 'Vaga'}</Text>
            <Text style={styles.location}>📍 {item.vacancy?.location}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {activeInterview && (
          <View style={styles.interviewBox}>
            <Ionicons name={activeInterview.interview_type === 'online' ? 'videocam' : 'location'} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.interviewTitle}>
                {activeInterview.interview_type === 'online' ? 'Entrevista Online' : 'Entrevista Presencial'}
              </Text>
              <Text style={styles.interviewDetail}>
                {new Date(activeInterview.scheduled_at).toLocaleString('pt-MZ')}
              </Text>
              {activeInterview.interview_type === 'in_person' && activeInterview.location && (
                <Text style={styles.interviewDetail}>Local: {activeInterview.location}</Text>
              )}
            </View>
          </View>
        )}

        {isOnlineInterview && activeInterview?.meeting_link && (
          <Button
            title="🎥 Entrar na Sala de Entrevista"
            onPress={() => handleJoinInterview(activeInterview.meeting_link)}
            variant="primary"
            size="medium"
            fullWidth
          />
        )}

        {item.status === 'rejected' && (
          <Text style={styles.rejectedText}>Infelizmente, não avançámos com a tua candidatura desta vez.</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.loadingContainer}><Text>Carregando...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Candidaturas</Text>
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
            <Text style={styles.emptyText}>Ainda não te candidataste a nenhuma vaga.</Text>
            <Button title="Ver Vagas Disponíveis" onPress={() => router.push('/vacancies')} variant="primary" size="medium" />
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
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  vacancyTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  location: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text.primary },
  interviewBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#E0E7FF', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  interviewTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  interviewDetail: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  rejectedText: { fontSize: fontSize.sm, color: colors.error, fontStyle: 'italic', marginTop: spacing.sm },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.lg, textAlign: 'center' },
});