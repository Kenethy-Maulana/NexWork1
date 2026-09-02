// app/my-offers.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Contract } from '../lib/supabase';

export default function MyOffersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employer:profiles!employer_id(full_name, company_name, avatar_url, user_type)
        `)
        .eq('worker_id', user?.id)
        .in('status', ['pending', 'active', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ofertas:', error);
      } else {
        setOffers(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar ofertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (offerId: string, response: 'active' | 'rejected') => {
    const isAccept = response === 'active';
    const message = isAccept 
      ? 'Tem certeza que deseja aceitar este contrato? Ele ficará ativo imediatamente.' 
      : 'Tem certeza que deseja recusar esta oferta?';

    // Usar window.confirm para garantir funcionamento 100% na Web
    const confirmed = window.confirm(message);

    if (!confirmed) {
      console.log('⚠️ Ação cancelada pelo utilizador.');
      return;
    }

    console.log(`🚀 Tentando atualizar oferta ${offerId} para status: ${response}`);

    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({ status: response })
        .eq('id', offerId)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar oferta:', error);
        alert('Erro ao atualizar: ' + error.message);
      } else {
        console.log('✅ Oferta atualizada com sucesso:', data);
        alert(isAccept ? '✅ Oferta aceite! O contrato está ativo.' : '❌ Oferta recusada.');
        fetchOffers(); // Recarrega a lista para mostrar o novo status
      }
    } catch (err: any) {
      console.error('❌ Erro crítico:', err);
      alert('Erro: ' + err.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);
  };

  const renderOffer = ({ item }: { item: any }) => {
    const employerName = item.employer?.user_type === 'company' 
      ? item.employer?.company_name 
      : item.employer?.full_name || 'Empresa';

    return (
      <View style={styles.offerCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Ionicons name="business" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.employerName}>{employerName}</Text>
            <Text style={styles.jobTitle}>{item.job_title}</Text>
          </View>
          <View style={[styles.statusBadge, item.status === 'pending' ? styles.pending : item.status === 'active' ? styles.active : styles.rejected]}>
            <Text style={styles.statusText}>
              {item.status === 'pending' ? 'Pendente' : item.status === 'active' ? 'Ativo' : 'Recusada'}
            </Text>
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

        {item.status === 'pending' && (
          <View style={styles.actionsRow}>
            <Button 
              title="Recusar" 
              onPress={() => handleResponse(item.id, 'rejected')} 
              variant="outline" 
              size="small" 
            />
            <Button 
              title="Aceitar Oferta" 
              onPress={() => handleResponse(item.id, 'active')} 
              variant="primary" 
              size="small" 
            />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando ofertas...</Text>
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
        <Text style={styles.headerTitle}>Minhas Ofertas</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>Nenhuma oferta recebida ainda</Text>
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
  offerCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  employerName: { fontSize: fontSize.sm, color: colors.text.secondary },
  jobTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  pending: { backgroundColor: '#FEF3C7' },
  active: { backgroundColor: '#DCFCE7' },
  rejected: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text.primary },
  detailsRow: { gap: spacing.sm, marginBottom: spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { fontSize: fontSize.sm, color: colors.text.primary, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
});