// app/my-contracts.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function MyContractsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          worker:profiles!worker_id(full_name, company_name, avatar_url, user_type, trust_score, level)
        `)
        .eq('employer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar contratos:', error);
      } else {
        setContracts(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar contratos:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FEF3C7'; // Amarelo
      case 'active': return '#DCFCE7';  // Verde
      case 'rejected': return '#FEE2E2'; // Vermelho
      default: return colors.surfaceDark;
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
    const workerName = item.worker?.user_type === 'company' 
      ? item.worker?.company_name 
      : item.worker?.full_name || 'Trabalhador';

    return (
      <View style={styles.contractCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName}>{workerName}</Text>
            <Text style={styles.jobTitle}>{item.job_title}</Text>
            {item.worker?.trust_score && (
              <View style={styles.trustRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.trustText}>{item.worker.trust_score} • {item.worker.level}</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
            <Text style={styles.detailText}>{formatCurrency(item.monthly_salary)}/mês</Text>
          </View>
          {item.working_hours && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={styles.detailText} numberOfLines={1}>{item.working_hours}</Text>
            </View>
          )}
        </View>

        {item.status === 'rejected' && (
          <View style={styles.rejectedBox}>
            <Ionicons name="close-circle-outline" size={16} color={colors.error} />
            <Text style={styles.rejectedText}>O trabalhador recusou esta oferta.</Text>
          </View>
        )}

        {item.status === 'active' && (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.activeText}>Contrato em vigor. Início: {new Date(item.start_date).toLocaleDateString('pt-MZ')}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando contratos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Contratos</Text>
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
            <Text style={styles.emptyText}>Nenhuma oferta enviada ainda</Text>
            <Text style={styles.emptySubtext}>Use a "Contratação Rápida" para enviar a sua primeira oferta.</Text>
            <Button 
              title="Enviar Nova Oferta" 
              onPress={() => router.push('/hire-worker')} 
              variant="primary" 
              size="medium" 
            />
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
  contractCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  jobTitle: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  trustText: { fontSize: fontSize.xs, color: colors.text.secondary, fontWeight: '600' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text.primary },
  detailsRow: { gap: spacing.sm, marginBottom: spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { fontSize: fontSize.sm, color: colors.text.primary, fontWeight: '500' },
  rejectedBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#FEE2E2', padding: spacing.sm, borderRadius: borderRadius.md },
  rejectedText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
  activeBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#DCFCE7', padding: spacing.sm, borderRadius: borderRadius.md },
  activeText: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.lg, textAlign: 'center' },
});