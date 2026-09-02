// app/vacancy-details.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
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

// Tipo atualizado para guardar o tamanho em bytes de forma segura
type UploadedDoc = {
  name: string;
  sizeDisplay: string;
  sizeBytes: number;
  uri: string;
};

export default function VacancyDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});

  useEffect(() => {
    fetchVacancy();
  }, [id]);

  const fetchVacancy = async () => {
    const { data, error } = await supabase
      .from('job_vacancies')
      .select(`*, employer:profiles!employer_id(full_name, company_name, avatar_url, user_type)`)
      .eq('id', id)
      .single();

    if (error) {
      alert('Vaga não encontrada');
      router.replace('/vacancies');
    } else {
      setVacancy(data);
    }
    setLoading(false);
  };

  const handleFileSelect = async (docType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      // Correção do Erro 1: Usar fallback 0 se file.size for undefined
      const sizeBytes = file.size || 0; 
      const sizeDisplay = (sizeBytes / 1024 / 1024).toFixed(2) + ' MB';

      setUploadedDocs(prev => ({
        ...prev,
        [docType]: { name: file.name, sizeDisplay, sizeBytes, uri: file.uri }
      }));
      alert(`✅ Ficheiro "${file.name}" selecionado!`);
    } catch (error) {
      console.error('Erro ao selecionar ficheiro:', error);
      alert('Erro ao selecionar ficheiro.');
    }
  };

  const handleRemoveFile = (docType: string) => {
    setUploadedDocs(prev => {
      const updated = { ...prev };
      delete updated[docType];
      return updated;
    });
  };

  const handleApply = async () => {
    if (!coverLetter.trim()) {
      alert('Por favor, escreva uma carta de apresentação.');
      return;
    }

    const missingDocs = REQUIRED_DOCS.filter(doc => doc.required && !uploadedDocs[doc.id]);
    if (missingDocs.length > 0) {
      alert(`Documentos obrigatórios em falta:\n- ${missingDocs.map(d => d.label).join('\n- ')}`);
      return;
    }

    setApplying(true);
    try {
      // 1. Criar candidatura
      const { data: application, error: appError } = await supabase
        .from('job_applications')
        .insert({
          vacancy_id: id,
          candidate_id: user?.id,
          cover_letter: coverLetter,
          expected_salary: expectedSalary ? parseFloat(expectedSalary) : null,
          status: 'pending',
        })
        .select()
        .single();

      if (appError) throw appError;

      // 2. Fazer UPLOAD REAL para o Supabase Storage e salvar no banco
      for (const [docType, fileInfo] of Object.entries(uploadedDocs)) {
        const fileExt = fileInfo.name.split('.').pop() || 'pdf';
        const fileName = `${application.id}_${docType}.${fileExt}`;
        const filePath = `${application.id}/${fileName}`;

        // Upload para o bucket
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(filePath, {
            uri: fileInfo.uri,
            name: fileName,
            type: 'application/pdf',
          });

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('job-documents')
          .getPublicUrl(filePath);

        // Salvar registro no banco
        // Correção dos Erros 2 e 3: Usamos fileInfo.sizeBytes diretamente (é um número), sem regex perigoso
        await supabase.from('job_documents').insert({
          application_id: application.id,
          document_type: docType,
          file_name: fileInfo.name,
          file_url: urlData.publicUrl,
          file_size: fileInfo.sizeBytes, 
        });
      }

      alert('✅ Candidatura enviada com sucesso! Documentos anexados.');
      router.replace('/my-applications');
    } catch (err: any) {
      console.error('Erro ao candidatar:', err);
      alert('Erro: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading || !vacancy) {
    return <SafeAreaView style={styles.loadingContainer}><Text>Carregando...</Text></SafeAreaView>;
  }

  const isOwner = user?.id === vacancy.employer_id;
  const employerName = vacancy.employer?.user_type === 'company' ? vacancy.employer?.company_name : vacancy.employer?.full_name || 'Empresa';
  const formatCurrency = (value: number | null) => value ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value) : 'A combinar';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Vaga</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{vacancy.title}</Text>
          <View style={styles.employerRow}>
            <Ionicons name="business-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.employerText}>{employerName}</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}><Ionicons name="location-outline" size={18} color={colors.primary} /><Text style={styles.infoText}>{vacancy.location}</Text></View>
            <View style={styles.infoItem}><Ionicons name="cash-outline" size={18} color={colors.success} /><Text style={styles.infoText}>{vacancy.salary_min && vacancy.salary_max ? `${formatCurrency(vacancy.salary_min)} - ${formatCurrency(vacancy.salary_max)}` : 'A combinar'}</Text></View>
          </View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Descrição</Text><Text style={styles.description}>{vacancy.description}</Text></View>
          {vacancy.requirements?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requisitos</Text>
              {vacancy.requirements.map((req: string, i: number) => (<View key={i} style={styles.listItem}><Ionicons name="checkmark-circle" size={16} color={colors.primary} /><Text style={styles.listText}>{req}</Text></View>))}
            </View>
          )}
        </View>

        {isOwner ? (
          <View style={styles.card}>
            <View style={styles.ownerNotice}>
              <Ionicons name="information-circle" size={32} color={colors.primary} />
              <Text style={styles.ownerNoticeText}>Você é o criador desta vaga. Para gerir candidatos, use o botão "Gerir Candidaturas" na lista de vagas.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Candidatar-se a esta vaga</Text>
            <Input label="Carta de Apresentação *" placeholder="Explique por que é o candidato ideal..." value={coverLetter} onChangeText={setCoverLetter} icon="text-outline" multiline numberOfLines={5} />
            <Input label="Pretensão Salarial (MT) - Opcional" placeholder="Ex: 35000" value={expectedSalary} onChangeText={setExpectedSalary} icon="cash-outline" keyboardType="numeric" />
            
            <Text style={styles.sectionTitle}>Documentos Obrigatórios</Text>
            <Text style={styles.helperText}>Anexe os documentos solicitados. Os campos marcados com * são obrigatórios.</Text>

            {REQUIRED_DOCS.map((doc) => {
              const isUploaded = !!uploadedDocs[doc.id];
              const docData = uploadedDocs[doc.id];
              return (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Ionicons name={doc.icon as any} size={20} color={isUploaded ? colors.success : colors.text.secondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docLabel}>{doc.label} {doc.required && <Text style={styles.requiredStar}>*</Text>}</Text>
                      {isUploaded && docData ? (
                        <Text style={styles.docFileName}>{docData.name} ({docData.sizeDisplay})</Text>
                      ) : (
                        <Text style={styles.docHint}>Nenhum ficheiro selecionado</Text>
                      )}
                    </View>
                  </View>
                  {isUploaded ? (
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFile(doc.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileSelect(doc.id)}>
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                      <Text style={styles.uploadText}>Anexar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <View style={{ marginTop: spacing.lg }}>
              <Button title="Enviar Candidatura" onPress={handleApply} variant="primary" size="large" fullWidth loading={applying} />
            </View>
          </View>
        )}
      </ScrollView>
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
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  employerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  employerText: { fontSize: fontSize.md, color: colors.text.secondary },
  infoGrid: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoText: { fontSize: fontSize.sm, color: colors.text.primary, fontWeight: '500' },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  listText: { fontSize: fontSize.md, color: colors.text.primary, flex: 1, lineHeight: 22 },
  helperText: { fontSize: fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  docInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  docLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary },
  requiredStar: { color: colors.error },
  docFileName: { fontSize: fontSize.xs, color: colors.success, marginTop: spacing.xs },
  docHint: { fontSize: fontSize.xs, color: colors.text.light, marginTop: spacing.xs },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surfaceDark },
  uploadText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  removeButton: { padding: spacing.sm },
  ownerNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#DBEAFE', padding: spacing.lg, borderRadius: borderRadius.md },
  ownerNoticeText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600', flex: 1, lineHeight: 22 },
});