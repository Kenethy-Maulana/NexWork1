// app/my-contracts.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function MyContractsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`*, worker:profiles!worker_id(full_name, company_name, avatar_url, user_type, trust_score, level)`)
        .eq('employer_id', user?.id)
        .order('created_at', { ascending: false });
      if (!error) setContracts(data || []);
    } catch (err) { console.error('Erro ao buscar contratos:', err); } 
    finally { setLoading(false); }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: colors.warning + '20', text: colors.warning };
      case 'active': return { bg: colors.success + '20', text: colors.success };
      case 'rejected': return { bg: colors.error + '20', text: colors.error };
      default: return { bg: colors.surfaceLight, text: colors.text.secondary };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando Resposta';
      case 'active': return 'Contrato Ativo';
      case 'rejected': return 'Oferta Recusada';
      default: return status;
    }
  };

  const renderContract = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const workerName = item.worker?.user_type === 'company' ? item.worker?.company_name : item.worker?.full_name || 'Trabalhador';

    return (
      <View style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.workerName, { color: colors.text.primary }]}>{workerName}</Text>
            <Text style={[styles.jobTitle, { color: colors.text.secondary }]}>{item.job_title}</Text>
            {item.worker?.trust_score && (
              <View style={styles.trustRow}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={[styles.trustText, { color: colors.text.secondary }]}>{item.worker.trust_score} • {item.worker.level}</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
            <Text style={[styles.detailText, { color: colors.text.primary }]}>{formatCurrency(item.monthly_salary)}/mês</Text>
          </View>
          {item.working_hours && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.text.primary }]} numberOfLines={1}>{item.working_hours}</Text>
            </View>
          )}
        </View>

        {item.status === 'rejected' && (
          <View style={[styles.rejectedBox, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
            <Ionicons name="close-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.rejectedText, { color: colors.error }]}>O trabalhador recusou esta oferta.</Text>
          </View>
        )}

        {item.status === 'active' && (
          <View style={[styles.activeBox, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.activeText, { color: colors.success }]}>Contrato em vigor. Início: {new Date(item.start_date).toLocaleDateString('pt-MZ')}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text.secondary }}>Carregando contratos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Meus Contratos</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id}
        renderItem={renderContract}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>Nenhuma oferta enviada ainda</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>Use a "Contratação Rápida" para enviar a sua primeira oferta.</Text>
            <Button title="Enviar Nova Oferta" onPress={() => router.push('/hire-worker')} variant="primary" size="medium" />
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
  contractCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: 16, fontWeight: '700' },
  jobTitle: { fontSize: 14, marginTop: 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  trustText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  detailsRow: { gap: 10, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, fontWeight: '600' },
  rejectedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  rejectedText: { fontSize: 14, fontWeight: '600' },
  activeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  activeText: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8, marginBottom: 24, textAlign: 'center' },
});