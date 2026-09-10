// app/interview-live.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { SuccessModal } from '../components/ui/SuccessModal';
import { supabase } from '../lib/supabase';

export default function InterviewLiveScreen() {
  const router = useRouter();
  const { interviewId } = useLocalSearchParams();
  const { colors, spacing } = useTheme();
  
  const [interview, setInterview] = useState<any>(null);
  const [candidateName, setCandidateName] = useState('Candidato');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (interviewId) fetchInterviewDetails();
  }, [interviewId]);

  const fetchInterviewDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('job_interviews')
        .select(`
          id, interview_type, meeting_link, location, scheduled_at, status,
          application:job_applications (
            candidate:profiles (full_name, company_name, user_type)
          )
        `)
        .eq('id', interviewId)
        .single();

      if (error || !data) {
        console.error('Erro ao buscar entrevista:', error);
        Alert.alert('Erro', 'Entrevista não encontrada');
        handleGoBack();
        return;
      }

      setInterview(data);

      // ✅ CORREÇÃO DE TYPESCRIPT: Extração segura que funciona seja objeto ou array
      const app = data.application;
      const candidateData = Array.isArray(app) ? app[0] : app;
      const candidate = candidateData?.candidate;
      const candidateInfo = Array.isArray(candidate) ? candidate[0] : candidate;

      const cName = candidateInfo?.user_type === 'company'
        ? candidateInfo?.company_name
        : candidateInfo?.full_name;
        
      setCandidateName(cName || 'Candidato');
      
    } catch (err) {
      console.error('Exceção ao buscar entrevista:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false); // ✅ Garante que o loading sempre para
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleJoinMeeting = async () => {
    if (!interview?.meeting_link) {
      Alert.alert('Erro', 'Link da reunião não disponível.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(interview.meeting_link);
      if (supported) await Linking.openURL(interview.meeting_link);
      else Alert.alert('Erro', 'Não foi possível abrir o link da reunião.');
    } catch (error) {
      console.error('Erro ao abrir link:', error);
    }
  };

  const handleEndInterview = async () => {
    Alert.alert('Encerrar Entrevista', 'Marcar esta entrevista como concluída?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('job_interviews').update({ status: 'completed' }).eq('id', interviewId);
            setShowSuccess(true);
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível atualizar o estado.');
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar detalhes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!interview) return null;

  const isOnline = interview.interview_type === 'online';
  const meetingId = interview.meeting_link ? interview.meeting_link.split('/').pop() : 'N/A';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Sala de Entrevista</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name={isOnline ? "videocam" : "location"} size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Entrevista com {candidateName}</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {isOnline ? 'Modalidade: Online (Videochamada)' : 'Modalidade: Presencial'}
          </Text>
          
          {isOnline && (
            <View style={[styles.meetingBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.meetingLabel, { color: colors.text.secondary }]}>ID da Sala:</Text>
              <Text style={[styles.meetingId, { color: colors.primary }]}>{meetingId}</Text>
              <Text style={[styles.meetingHint, { color: colors.text.secondary }]}>Clique no botão abaixo para entrar na sala de vídeo gratuita.</Text>
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
          {isOnline && (
            <Button title="🎥 Entrar na Videochamada Agora" onPress={handleJoinMeeting} variant="primary" size="large" fullWidth />
          )}
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

      <SuccessModal 
        visible={showSuccess} 
        title="Entrevista Concluída! ✅" 
        message="A entrevista foi marcada como concluída com sucesso." 
        onClose={() => { setShowSuccess(false); handleGoBack(); }} 
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
  headerSpacer: { width: 40 },
  content: { flex: 1, padding: 20 },
  infoCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  meetingBox: { width: '100%', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  meetingLabel: { fontSize: 14, marginBottom: 4 },
  meetingId: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  meetingHint: { fontSize: 14, textAlign: 'center' },
  meetingText: { fontSize: 15, fontWeight: '600' },
  actions: { marginBottom: 20 },
  tipsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  tipsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  tipsText: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
});