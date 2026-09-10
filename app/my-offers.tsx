// app/my-offers.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function MyOffersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`*, employer:profiles!employer_id(full_name, company_name, avatar_url, user_type)`)
        .eq('worker_id', user?.id)
        .in('status', ['pending', 'active', 'rejected'])
        .order('created_at', { ascending: false });
      if (!error) setOffers(data || []);
    } catch (err) { console.error('Erro ao buscar ofertas:', err); } 
    finally { setLoading(false); }
  };

  const handleResponse = async (offerId: string, response: 'active' | 'rejected') => {
    const isAccept = response === 'active';
    const message = isAccept 
      ? 'Tem certeza que deseja aceitar este contrato? Ele ficará ativo imediatamente.' 
      : 'Tem certeza que deseja recusar esta oferta?';

    if (!window.confirm(message)) return;

    try {
      const { error } = await supabase.from('contracts').update({ status: response }).eq('id', offerId);
      if (error) {
        alert('Erro ao atualizar: ' + error.message);
      } else {
        alert(isAccept ? '✅ Oferta aceite! O contrato está ativo.' : '❌ Oferta recusada.');
        fetchOffers();
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);

  const renderOffer = ({ item }: { item: any }) => {
    const employerName = item.employer?.user_type === 'company' ? item.employer?.company_name : item.employer?.full_name || 'Empresa';
    
    // CORREÇÃO: Declarar explicitamente como string para evitar erro de tipo do TypeScript
    let statusBg: string = colors.surfaceLight;
    let statusText: string = colors.text.secondary;
    
    if (item.status === 'pending') { 
      statusBg = colors.warning + '20'; 
      statusText = colors.warning; 
    } else if (item.status === 'active') { 
      statusBg = colors.success + '20'; 
      statusText = colors.success; 
    } else if (item.status === 'rejected') { 
      statusBg = colors.error + '20'; 
      statusText = colors.error; 
    }

    return (
      <View style={[styles.offerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="business" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.employerName, { color: colors.text.secondary }]}>{employerName}</Text>
            <Text style={[styles.jobTitle, { color: colors.text.primary }]}>{item.job_title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusText }]}>
              {item.status === 'pending' ? 'Pendente' : item.status === 'active' ? 'Ativo' : 'Recusada'}
            </Text>
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

        {item.status === 'pending' && (
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            <Button title="Recusar" onPress={() => handleResponse(item.id, 'rejected')} variant="outline" size="small" />
            <Button title="Aceitar Oferta" onPress={() => handleResponse(item.id, 'active')} variant="primary" size="small" />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text.secondary }}>Carregando ofertas...</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Minhas Ofertas</Text>
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
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>Nenhuma oferta recebida ainda</Text>
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
  offerCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  employerName: { fontSize: 14 },
  jobTitle: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  detailsRow: { gap: 10, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 16, fontWeight: '500' },
});