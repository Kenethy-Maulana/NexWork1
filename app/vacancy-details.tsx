// app/vacancy-details.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const REQUIRED_DOCS = [
  { id: 'cv', label: 'Curriculum Vitae (CV)', icon: 'document-text', required: true },
  { id: 'id', label: 'Fotocópia do BI', icon: 'card', required: true },
  { id: 'nuit', label: 'NUIT', icon: 'receipt', required: true },
  { id: 'certificate', label: 'Certificados de Habilitação', icon: 'school', required: false },
];

type UploadedDoc = { name: string; sizeDisplay: string; sizeBytes: number; uri: string; };

export default function VacancyDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});

  useEffect(() => { fetchVacancy(); }, [id]);

  const fetchVacancy = async () => {
    const { data, error } = await supabase
      .from('job_vacancies')
      .select(`*, employer:profiles!employer_id(full_name, company_name, avatar_url, user_type)`)
      .eq('id', id).single();
    if (error) { alert('Vaga não encontrada'); router.replace('/vacancies'); } 
    else { setVacancy(data); }
    setLoading(false);
  };

  const handleFileSelect = async (docType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      const sizeBytes = file.size || 0;
      const sizeDisplay = (sizeBytes / 1024 / 1024).toFixed(2) + ' MB';
      setUploadedDocs(prev => ({ ...prev, [docType]: { name: file.name, sizeDisplay, sizeBytes, uri: file.uri } }));
      alert(`✅ Ficheiro "${file.name}" selecionado!`);
    } catch (error) { alert('Erro ao selecionar ficheiro.'); }
  };

  const handleRemoveFile = (docType: string) => {
    setUploadedDocs(prev => { const updated = { ...prev }; delete updated[docType]; return updated; });
  };

  const handleApply = async () => {
    if (!coverLetter.trim()) { alert('Por favor, escreva uma carta de apresentação.'); return; }
    const missingDocs = REQUIRED_DOCS.filter(doc => doc.required && !uploadedDocs[doc.id]);
    if (missingDocs.length > 0) { alert(`Documentos obrigatórios em falta:\n- ${missingDocs.map(d => d.label).join('\n- ')}`); return; }

    setApplying(true);
    try {
      const { data: application, error: appError } = await supabase
        .from('job_applications')
        .insert({ vacancy_id: id, candidate_id: user?.id, cover_letter: coverLetter, expected_salary: expectedSalary ? parseFloat(expectedSalary) : null, status: 'pending' })
        .select().single();
      if (appError) throw appError;

      for (const [docType, fileInfo] of Object.entries(uploadedDocs)) {
        const fileExt = fileInfo.name.split('.').pop() || 'pdf';
        const fileName = `${application.id}_${docType}.${fileExt}`;
        const filePath = `${application.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('job-documents').upload(filePath, { uri: fileInfo.uri, name: fileName, type: 'application/pdf' });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('job-documents').getPublicUrl(filePath);
        await supabase.from('job_documents').insert({ application_id: application.id, document_type: docType, file_name: fileInfo.name, file_url: urlData.publicUrl, file_size: fileInfo.sizeBytes });
      }

      alert('✅ Candidatura enviada com sucesso!');
      router.replace('/my-applications');
    } catch (err: any) { alert('Erro: ' + err.message); } 
    finally { setApplying(false); }
  };

  if (loading || !vacancy) {
    return <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}><Text style={{ color: colors.text.secondary }}>Carregando...</Text></SafeAreaView>;
  }

  const isOwner = user?.id === vacancy.employer_id;
  const employerName = vacancy.employer?.user_type === 'company' ? vacancy.employer?.company_name : vacancy.employer?.full_name || 'Empresa';
  const formatCurrency = (value: number | null) => value ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value) : 'A combinar';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Detalhes da Vaga</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>{vacancy.title}</Text>
          <View style={styles.employerRow}>
            <Ionicons name="business-outline" size={16} color={colors.text.secondary} />
            <Text style={[styles.employerText, { color: colors.text.secondary }]}>{employerName}</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}><Ionicons name="location-outline" size={18} color={colors.primary} /><Text style={[styles.infoText, { color: colors.text.primary }]}>{vacancy.location}</Text></View>
            <View style={styles.infoItem}><Ionicons name="cash-outline" size={18} color={colors.success} /><Text style={[styles.infoText, { color: colors.text.primary }]}>{vacancy.salary_min && vacancy.salary_max ? `${formatCurrency(vacancy.salary_min)} - ${formatCurrency(vacancy.salary_max)}` : 'A combinar'}</Text></View>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Descrição</Text>
            <Text style={[styles.description, { color: colors.text.secondary }]}>{vacancy.description}</Text>
          </View>
          {vacancy.requirements?.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Requisitos</Text>
              {vacancy.requirements.map((req: string, i: number) => (
                <View key={i} style={styles.listItem}><Ionicons name="checkmark-circle" size={16} color={colors.primary} /><Text style={[styles.listText, { color: colors.text.primary }]}>{req}</Text></View>
              ))}
            </View>
          )}
        </View>

        {isOwner ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.ownerNotice, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Ionicons name="information-circle" size={32} color={colors.primary} />
              <Text style={[styles.ownerNoticeText, { color: colors.primary }]}>Você é o criador desta vaga. Para gerir candidatos, use o botão "Gerir Candidaturas" na lista de vagas.</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Candidatar-se a esta vaga</Text>
            <Input label="Carta de Apresentação *" placeholder="Explique por que é o candidato ideal..." value={coverLetter} onChangeText={setCoverLetter} icon="text-outline" multiline numberOfLines={5} />
            <Input label="Pretensão Salarial (MT) - Opcional" placeholder="Ex: 35000" value={expectedSalary} onChangeText={setExpectedSalary} icon="cash-outline" keyboardType="numeric" />
            
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Documentos Obrigatórios</Text>
            <Text style={[styles.helperText, { color: colors.text.secondary }]}>Anexe os documentos solicitados. Os campos marcados com * são obrigatórios.</Text>

            {REQUIRED_DOCS.map((doc) => {
              const isUploaded = !!uploadedDocs[doc.id];
              const docData = uploadedDocs[doc.id];
              return (
                <View key={doc.id} style={[styles.docRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.docInfo}>
                    <Ionicons name={doc.icon as any} size={20} color={isUploaded ? colors.success : colors.text.secondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docLabel, { color: colors.text.primary }]}>{doc.label} {doc.required && <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>}</Text>
                      {isUploaded && docData ? (
                        <Text style={[styles.docFileName, { color: colors.success }]}>{docData.name} ({docData.sizeDisplay})</Text>
                      ) : (
                        <Text style={[styles.docHint, { color: colors.text.light }]}>Nenhum ficheiro selecionado</Text>
                      )}
                    </View>
                  </View>
                  {isUploaded ? (
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFile(doc.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.surfaceLight }]} onPress={() => handleFileSelect(doc.id)}>
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                      <Text style={[styles.uploadText, { color: colors.primary }]}>Anexar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <View style={{ marginTop: 20 }}>
              <Button title="Enviar Candidatura" onPress={handleApply} variant="primary" size="large" fullWidth loading={applying} />
            </View>
          </View>
        )}
      </ScrollView>
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, lineHeight: 32 },
  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  employerText: { fontSize: 15 },
  infoGrid: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, fontWeight: '500' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  listText: { fontSize: 15, flex: 1, lineHeight: 22 },
  helperText: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  docInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '600' },
  requiredStar: { fontWeight: '700' },
  docFileName: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  docHint: { fontSize: 12, marginTop: 4 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  uploadText: { fontSize: 13, fontWeight: '600' },
  removeButton: { padding: 8 },
  ownerNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  ownerNoticeText: { fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 22 },
});