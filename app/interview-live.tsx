// app/interview-live.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, JobInterview } from '../lib/supabase';

export default function InterviewLiveScreen() {
  const router = useRouter();
  const { interviewId } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [interview, setInterview] = useState<JobInterview | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (interviewId) fetchInterviewDetails();
  }, [interviewId]);

  const fetchInterviewDetails = async () => {
    const { data, error } = await supabase
      .from('job_interviews')
      .select(`*, application:job_applications!application_id(candidate:profiles!candidate_id(full_name, company_name, avatar_url, user_type))`)
      .eq('id', interviewId).single();

    if (error) { Alert.alert('Erro', 'Entrevista não encontrada'); router.back(); } 
    else {
      setInterview(data);
      const cName = data.application?.candidate?.user_type === 'company' ? data.application?.candidate?.company_name : data.application?.candidate?.full_name;
      setCandidateName(cName || 'Candidato');
    }
    setLoading(false);
  };

  const handleJoinMeeting = async () => {
    if (!interview) return;
    const meetingUrl = `https://meet.jit.si/NexWork-Interview-${interviewId}`;
    try {
      const supported = await Linking.canOpenURL(meetingUrl);
      if (supported) await Linking.openURL(meetingUrl);
      else Alert.alert('Erro', 'Não foi possível abrir o link da reunião.');
    } catch (error) { console.error('Erro ao abrir link:', error); }
  };

  const handleEndInterview = async () => {
    Alert.alert('Encerrar Entrevista', 'Marcar esta entrevista como concluída?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: async () => {
        await supabase.from('job_interviews').update({ status: 'completed' }).eq('id', interviewId);
        Alert.alert('Sucesso', 'Entrevista marcada como concluída.');
        router.back();
      }}
    ]);
  };

  if (loading || !interview) {
    return <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}><Text style={{ color: colors.text.secondary }}>Carregando detalhes...</Text></SafeAreaView>;
  }

  const isOnline = interview.interview_type === 'online';
  const meetingId = `NexWork-Interview-${interviewId}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Sala de Entrevista</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="videocam" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Entrevista com {candidateName}</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{isOnline ? 'Modalidade: Online (Videochamada)' : 'Modalidade: Presencial'}</Text>
          
          {isOnline && (
            <View style={[styles.meetingBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.meetingLabel, { color: colors.text.secondary }]}>ID da Sala:</Text>
              <Text style={[styles.meetingId, { color: colors.primary }]}>{meetingId}</Text>
              <Text style={[styles.meetingHint, { color: colors.text.secondary }]}>Clique no botão abaixo para entrar na sala de vídeo gratuita (Jitsi Meet).</Text>
            </View>
          )}

          {!isOnline && interview.location && (
            <View style={[styles.meetingBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={[styles.meetingText, { color: colors.text.primary }]}>Local: {interview.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {isOnline && <Button title="🎥 Entrar na Videochamada Agora" onPress={handleJoinMeeting} variant="primary" size="large" fullWidth />}
          <View style={{ height: spacing.md }} />
          <Button title="Marcar Entrevista como Concluída" onPress={handleEndInterview} variant="outline" size="large" fullWidth />
        </View>

        <View style={[styles.tipsCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
          <Text style={[styles.tipsTitle, { color: colors.warning }]}>💡 Dicas para a entrevista:</Text>
          <Text style={[styles.tipsText, { color: colors.text.secondary }]}>• Certifique-se de ter uma boa conexão de internet.</Text>
          <Text style={[styles.tipsText, { color: colors.text.secondary }]}>• Encontre um local silencioso e bem iluminado.</Text>
          <Text style={[styles.tipsText, { color: colors.text.secondary }]}>• Tenha o seu CV e portfólio à mão.</Text>
        </View>
      </View>
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
  content: { flex: 1, padding: 20 },
  infoCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  meetingBox: { width: '100%', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  meetingLabel: { fontSize: 13, marginBottom: 4 },
  meetingId: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  meetingHint: { fontSize: 13, textAlign: 'center' },
  meetingText: { fontSize: 15, fontWeight: '600' },
  actions: { marginBottom: 20 },
  tipsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  tipsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  tipsText: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
});