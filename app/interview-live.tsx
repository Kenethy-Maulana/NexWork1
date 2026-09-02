// app/interview-live.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, JobInterview } from '../lib/supabase';

export default function InterviewLiveScreen() {
  const router = useRouter();
  const { interviewId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [interview, setInterview] = useState<JobInterview | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (interviewId) {
      fetchInterviewDetails();
    }
  }, [interviewId]);

  const fetchInterviewDetails = async () => {
    const { data, error } = await supabase
      .from('job_interviews')
      .select(`
        *,
        application:job_applications!application_id(
          candidate:profiles!candidate_id(full_name, company_name, avatar_url, user_type)
        )
      `)
      .eq('id', interviewId)
      .single();

    if (error) {
      Alert.alert('Erro', 'Entrevista não encontrada');
      router.back();
    } else {
      setInterview(data);
      const cName = data.application?.candidate?.user_type === 'company'
        ? data.application?.candidate?.company_name
        : data.application?.candidate?.full_name;
      setCandidateName(cName || 'Candidato');
    }
    setLoading(false);
  };

  const handleJoinMeeting = async () => {
    if (!interview) return;

    // Gerar link único do Jitsi Meet para esta entrevista
    const meetingId = `NexWork-Interview-${interviewId}`;
    const meetingUrl = `https://meet.jit.si/${meetingId}`;

    // Atualizar status para "completed" se ainda não estiver, ou manter "scheduled"
    // Aqui apenas abrimos o link
    try {
      const supported = await Linking.canOpenURL(meetingUrl);
      if (supported) {
        await Linking.openURL(meetingUrl);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link da reunião.');
      }
    } catch (error) {
      console.error('Erro ao abrir link:', error);
    }
  };

  const handleEndInterview = async () => {
    Alert.alert(
      'Encerrar Entrevista',
      'Marcar esta entrevista como concluída?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('job_interviews')
              .update({ status: 'completed' })
              .eq('id', interviewId);
            
            Alert.alert('Sucesso', 'Entrevista marcada como concluída.');
            router.back();
          }
        }
      ]
    );
  };

  if (loading || !interview) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Carregando detalhes da entrevista...</Text>
      </SafeAreaView>
    );
  }

  const isOnline = interview.interview_type === 'online';
  const meetingId = `NexWork-Interview-${interviewId}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sala de Entrevista</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="videocam" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Entrevista com {candidateName}</Text>
          <Text style={styles.subtitle}>
            {isOnline ? 'Modalidade: Online (Videochamada)' : 'Modalidade: Presencial'}
          </Text>
          
          {isOnline && (
            <View style={styles.meetingBox}>
              <Text style={styles.meetingLabel}>ID da Sala:</Text>
              <Text style={styles.meetingId}>{meetingId}</Text>
              <Text style={styles.meetingHint}>
                Clique no botão abaixo para entrar na sala de vídeo gratuita (Jitsi Meet).
              </Text>
            </View>
          )}

          {!isOnline && interview.location && (
            <View style={styles.meetingBox}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles.meetingText}>Local: {interview.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {isOnline && (
            <Button
              title="🎥 Entrar na Videochamada Agora"
              onPress={handleJoinMeeting}
              variant="primary"
              size="large"
              fullWidth
            />
          )}
          
          <View style={{ height: spacing.md }} />
          
          <Button
            title="Marcar Entrevista como Concluída"
            onPress={handleEndInterview}
            variant="outline"
            size="large"
            fullWidth
          />
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Dicas para a entrevista:</Text>
          <Text style={styles.tipsText}>• Certifique-se de ter uma boa conexão de internet.</Text>
          <Text style={styles.tipsText}>• Encontre um local silencioso e bem iluminado.</Text>
          <Text style={styles.tipsText}>• Tenha o seu CV e portfólio à mão.</Text>
        </View>
      </View>
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
  content: { flex: 1, padding: spacing.lg },
  infoCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg },
  meetingBox: { width: '100%', backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  meetingLabel: { fontSize: fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs },
  meetingId: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  meetingHint: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: 'center' },
  meetingText: { fontSize: fontSize.md, color: colors.text.primary, fontWeight: '600' },
  actions: { marginBottom: spacing.lg },
  tipsCard: { backgroundColor: '#FEF3C7', borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#FDE68A' },
  tipsTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#92400E', marginBottom: spacing.sm },
  tipsText: { fontSize: fontSize.sm, color: '#78350F', marginBottom: spacing.xs, lineHeight: 20 },
});