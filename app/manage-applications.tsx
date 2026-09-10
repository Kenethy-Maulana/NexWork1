// app/manage-applications.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, 
  ScrollView, Linking, Alert, Modal, TextInput 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { SuccessModal } from '../components/ui/SuccessModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';

export default function ManageApplicationsScreen() {
  const router = useRouter();
  const { vacancyId } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, fontSize, spacing, borderRadius } = useTheme();
  
  const [vacancy, setVacancy] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'interview' | 'approved' | 'rejected'>('all');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<'online' | 'in_person'>('online');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('10:00');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!vacancyId) {
      Alert.alert('Erro', 'ID da vaga não encontrado.');
      router.replace('/(tabs)');
      return;
    }
    fetchVacancy();
    fetchApplications();
  }, [vacancyId]);

  const fetchVacancy = async () => {
    const { data, error } = await supabase.from('job_vacancies').select('*').eq('id', vacancyId).single();
    if (!error && data) setVacancy(data);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('job_applications')
        .select(`
          *,
          candidate:profiles!candidate_id(full_name, company_name, avatar_url, user_type, trust_score, level, bio, location),
          documents:job_documents(*),
          interview:job_interviews(id, interview_type, meeting_link, location, scheduled_at, status)
        `)
        .eq('vacancy_id', vacancyId)
        .order('applied_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (!error) {
        setApplications(data || []);
      } else {
        console.error('Erro ao buscar candidaturas:', error);
      }
    } catch (err) {
      console.error('Exceção ao buscar candidaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from('job_applications').update({ status: newStatus }).eq('id', appId);
    if (error) {
      Alert.alert('Erro', 'Erro ao atualizar: ' + error.message);
    } else {
      setSuccessMessage(newStatus === 'approved' ? 'Candidato aprovado com sucesso!' : newStatus === 'rejected' ? 'Candidatura rejeitada.' : 'Candidatura atualizada!');
      setShowSuccess(true);
      fetchApplications();
    }
  };

  const handleOpenScheduleModal = (appId: string) => {
    setSelectedAppId(appId);
    setInterviewType('online');
    setInterviewDate('');
    setInterviewTime('10:00');
    setInterviewLocation('');
    setShowCalendar(false);
    setIsScheduling(false);
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = async () => {
    if (!selectedAppId || !interviewDate.trim()) {
      Alert.alert('Atenção', 'Por favor, seleciona uma data no calendário.');
      return;
    }
    if (!interviewTime.trim()) {
      Alert.alert('Atenção', 'Por favor, indica a hora da entrevista.');
      return;
    }
    if (interviewType === 'in_person' && (!interviewLocation || interviewLocation.trim() === '')) {
      Alert.alert('Atenção', 'Por favor, indica o local da entrevista presencial.');
      return;
    }

    setIsScheduling(true);
    try {
      const application = applications.find(a => a.id === selectedAppId);
      if (!application) throw new Error('Candidatura não encontrada');

      const candidateId = application.candidate_id;
      const candidateName = application.candidate?.full_name || application.candidate?.company_name || 'Candidato';
      const vacancyTitle = vacancy?.title || 'esta vaga';

      const scheduledAt = new Date(`${interviewDate}T${interviewTime}:00`).toISOString();
      const meetingLink = interviewType === 'online' ? `https://meet.jit.si/NexWork-${selectedAppId}` : null;

      const { error: interviewError } = await supabase.from('job_interviews').insert({
        application_id: selectedAppId,
        interview_type: interviewType,
        scheduled_at: scheduledAt,
        duration_minutes: 30,
        location: interviewType === 'in_person' ? interviewLocation : null,
        meeting_link: meetingLink,
        status: 'scheduled',
      });

      if (interviewError) throw interviewError;

      await supabase.from('job_applications').update({ status: 'interview' }).eq('id', selectedAppId);

      if (candidateId) {
        await NotificationService.createNotification(
          candidateId,
          'interview_scheduled',
          'Entrevista Agendada! 📅',
          `Parabéns! Foste selecionado para uma entrevista ${interviewType === 'online' ? 'online' : 'presencial'} para a vaga "${vacancyTitle}".\n\nData: ${new Date(scheduledAt).toLocaleString('pt-MZ')}.`,
          selectedAppId,
          'application'
        );
      }

      if (user?.id) {
        await NotificationService.createNotification(
          user.id,
          'interview_scheduled',
          'Entrevista Marcada 📅',
          `Agendaste uma entrevista ${interviewType === 'online' ? 'online' : 'presencial'} com ${candidateName} para a vaga "${vacancyTitle}".\n\nData: ${new Date(scheduledAt).toLocaleString('pt-MZ')}.`,
          selectedAppId,
          'application'
        );
      }

      setShowScheduleModal(false);
      setSuccessMessage(`Entrevista agendada com sucesso! ${candidateName} foi notificado.`);
      setShowSuccess(true);
      fetchApplications();

    } catch (err: any) {
      console.error('Erro ao agendar:', err);
      Alert.alert('Erro', 'Não foi possível agendar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDownloadDoc = (fileUrl: string, fileName: string) => {
    if (!fileUrl || fileUrl.startsWith('blob:') || fileUrl.startsWith('file:')) {
      Alert.alert('Erro no Documento', 'O link do documento é inválido ou o upload falhou.');
      return;
    }
    Linking.openURL(fileUrl).catch(() => Alert.alert('Erro', 'Não foi possível abrir o documento.'));
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
    
    // ✅ CORREÇÃO CRÍTICA: O Supabase pode devolver a relação como Array ou Objeto. Normalizamos aqui.
    const rawInterview = item.interview;
    const currentInterview = Array.isArray(rawInterview) ? rawInterview[0] : rawInterview;

    // Log para depuração: abre o console (F12) e vê exatamente o que está a chegar aqui
    if (item.status === 'interview') {
      console.log('🔍 DEBUG ENTREVISTA - ID:', item.id, 'DADOS:', currentInterview);
    }

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
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: colors.text.primary }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {item.cover_letter && <Text style={[styles.coverLetter, { color: colors.text.secondary }]} numberOfLines={3}>"{item.cover_letter}"</Text>}

        {item.expected_salary && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={14} color={colors.success} />
            <Text style={[styles.salaryText, { color: colors.success }]}>
              Pretensão: {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(item.expected_salary)}
            </Text>
          </View>
        )}

        {docCount > 0 && (
          <View style={styles.docsRow}>
            {item.documents.map((doc: any) => (
              <TouchableOpacity 
                key={doc.id} 
                style={[styles.docChip, { backgroundColor: colors.surfaceLight }]}
                onPress={() => handleDownloadDoc(doc.file_url, doc.file_name)}
                activeOpacity={0.7}
              >
                <Ionicons name="download-outline" size={12} color={colors.primary} />
                <Text style={[styles.docChipText, { color: colors.primary }]}>{doc.document_type.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(item.status === 'pending' || item.status === 'reviewed') && (
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            <Button title="Rejeitar" onPress={() => updateStatus(item.id, 'rejected')} variant="outline" size="small" />
            <Button title="Agendar Entrevista" onPress={() => handleOpenScheduleModal(item.id)} variant="outline" size="small" />
            <Button title="Aprovar" onPress={() => updateStatus(item.id, 'approved')} variant="primary" size="small" />
          </View>
        )}

        {/* ✅ SECÇÃO DE ENTREVISTA AGENDADA (CORRIGIDA) */}
        {item.status === 'interview' && currentInterview && (
          <View style={[styles.interviewBox, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}>
            <View style={{ flex: 1, marginBottom: 12 }}>
              <Text style={[styles.interviewText, { color: colors.text.primary, fontWeight: '700' }]}>
                {currentInterview.interview_type === 'online' ? '🎥 Entrevista Online' : '📍 Entrevista Presencial'}
              </Text>
              
              {currentInterview.scheduled_at ? (
                <Text style={[styles.interviewSubtext, { color: colors.text.secondary }]}>
                  📅 {new Date(currentInterview.scheduled_at).toLocaleString('pt-MZ')}
                </Text>
              ) : (
                <Text style={[styles.interviewSubtext, { color: colors.error }]}>
                  ⚠️ Data não definida
                </Text>
              )}

              {currentInterview.interview_type === 'in_person' && currentInterview.location && (
                <Text style={[styles.interviewSubtext, { color: colors.text.secondary }]}>
                  📍 {currentInterview.location}
                </Text>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              {/* ✅ BOTÃO EXPLÍCITO PARA O EMPREGADOR ENTRAR NA SALA */}
              {currentInterview.interview_type === 'online' && currentInterview.meeting_link ? (
                <Button 
                  title="🎥 Entrar na Sala de Entrevista" 
                  onPress={() => {
                    console.log('🚀 Empregador a abrir link:', currentInterview.meeting_link);
                    Linking.openURL(currentInterview.meeting_link);
                  }} 
                  variant="primary" 
                  size="small" 
                  fullWidth 
                />
              ) : (
                <View style={{ flex: 1, padding: 10, alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: 8 }}>
                  <Text style={{ color: colors.text.secondary, fontSize: 12, fontWeight: '600' }}>
                    {currentInterview.interview_type === 'in_person' ? 'Entrevista Presencial' : 'Link pendente'}
                  </Text>
                </View>
              )}
              
              {/* ✅ "Ver Detalhes" FOI REMOVIDO CONFORME SOLICITADO */}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && applications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text.secondary }}>Carregando candidaturas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleGoBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
          Candidaturas{vacancy ? ` - ${vacancy.title}` : ''}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filtersScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.filtersRow}>
          {(['all', 'pending', 'interview', 'approved', 'rejected'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { borderColor: filter === f ? colors.primary : colors.border, backgroundColor: filter === f ? colors.primary : 'transparent' }]}
              onPress={() => { setFilter(f); fetchApplications(); }}
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

      <SuccessModal 
        visible={showSuccess} 
        title="Ação Concluída! ✅" 
        message={successMessage} 
        onClose={() => setShowSuccess(false)} 
      />

      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Agendar Entrevista</Text>
              
              <Text style={[styles.modalLabel, { color: colors.text.primary }]}>Modalidade:</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity 
                  style={[styles.typeChip, { backgroundColor: interviewType === 'online' ? colors.primary : colors.surfaceLight, borderColor: interviewType === 'online' ? colors.primary : colors.border }]}
                  onPress={() => setInterviewType('online')}
                >
                  <Ionicons name="videocam" size={16} color={interviewType === 'online' ? '#FFF' : colors.text.secondary} />
                  <Text style={[styles.typeText, { color: interviewType === 'online' ? '#FFF' : colors.text.secondary }]}>Online</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeChip, { backgroundColor: interviewType === 'in_person' ? colors.primary : colors.surfaceLight, borderColor: interviewType === 'in_person' ? colors.primary : colors.border }]}
                  onPress={() => setInterviewType('in_person')}
                >
                  <Ionicons name="location" size={16} color={interviewType === 'in_person' ? '#FFF' : colors.text.secondary} />
                  <Text style={[styles.typeText, { color: interviewType === 'in_person' ? '#FFF' : colors.text.secondary }]}>Presencial</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalLabel, { color: colors.text.primary, marginTop: 16 }]}>Data da Entrevista:</Text>
              <TouchableOpacity 
                style={[styles.dateSelector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowCalendar(!showCalendar)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateSelectorText, { color: interviewDate ? colors.text.primary : colors.text.light }]}>
                  {interviewDate || 'Selecionar data'}
                </Text>
              </TouchableOpacity>

              {showCalendar && (
                <View style={styles.calendarWrapper}>
                  <Calendar 
                    selectedDate={interviewDate} 
                    onDateSelect={(date) => {
                      setInterviewDate(date);
                      setShowCalendar(false);
                    }}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </View>
              )}

              <Text style={[styles.modalLabel, { color: colors.text.primary, marginTop: 16 }]}>Hora:</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                placeholder="Ex: 10:00"
                placeholderTextColor={colors.text.light}
                value={interviewTime}
                onChangeText={setInterviewTime}
              />

              {interviewType === 'in_person' && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.text.primary, marginTop: 16 }]}>Local:</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                    placeholder="Ex: Av. Julius Nyerere, Maputo"
                    placeholderTextColor={colors.text.light}
                    value={interviewLocation}
                    onChangeText={setInterviewLocation}
                  />
                </>
              )}

              {interviewType === 'online' && (
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.primary }]}>
                    Um link automático será gerado. O botão "Entrar na Sala" aparecerá aqui.
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <Button title="Cancelar" onPress={() => setShowScheduleModal(false)} variant="ghost" size="medium" />
                <Button 
                  title="Confirmar Agendamento" 
                  onPress={handleConfirmSchedule} 
                  variant="primary" 
                  size="medium" 
                  loading={isScheduling} 
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
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
  interviewBox: { flexDirection: 'column', padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  interviewText: { fontSize: 14 },
  interviewSubtext: { fontSize: 12, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', padding: 20 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { width: '100%', maxWidth: 500, padding: 24, borderRadius: 20, borderWidth: 1, alignSelf: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeText: { fontSize: 14, fontWeight: '600' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  dateSelectorText: { fontSize: 15, flex: 1 },
  calendarWrapper: { marginTop: 12, marginBottom: 12 },
  modalInput: { width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 24 },
});