// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, spacing, borderRadius } from '../../styles/theme';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/NotificationBell';
import TaskMap from '../../components/TaskMap'; // <-- NOVA IMPORTAÇÃO DO MAPA

// <-- ADICIONADO 'map' AO TIPO
type TabType = 'my' | 'available' | 'in_progress' | 'completed' | 'my_proposals' | 'my_offers' | 'map';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [tasks, setTasks] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (activeTab === 'my_offers') {
      router.push('/my-offers');
      setActiveTab('my');
    } else if (activeTab === 'my_proposals') {
      fetchMyProposals();
    } else {
      fetchTasks();
    }
  }, [activeTab, user]);

  const fetchTasks = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let query = supabase.from('tasks').select('*');

      switch (activeTab) {
        case 'my':
          query = query.eq('client_id', user.id);
          break;
        case 'available':
          query = query.eq('status', 'open').neq('client_id', user.id);
          break;
        case 'in_progress': {
          const { data: myProposals } = await supabase.from('proposals').select('task_id').eq('worker_id', user.id).eq('status', 'accepted');
          const acceptedTaskIds = myProposals?.map(p => p.task_id) || [];
          let orCondition = `client_id.eq.${user.id}`;
          if (acceptedTaskIds.length > 0) orCondition += `,id.in.(${acceptedTaskIds.join(',')})`;
          query = query.eq('status', 'in_progress').or(orCondition);
          break;
        }
        case 'completed': {
          const { data: completedProposals } = await supabase.from('proposals').select('task_id').eq('worker_id', user.id).eq('status', 'accepted');
          const completedTaskIds = completedProposals?.map(p => p.task_id) || [];
          let orCondition = `client_id.eq.${user.id}`;
          if (completedTaskIds.length > 0) orCondition += `,id.in.(${completedTaskIds.join(',')})`;
          query = query.eq('status', 'completed').or(orCondition);
          break;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar tarefas:', error);
        setTasks([]);
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMyProposals = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`*, task:tasks!task_id(id, title, category, location, budget, status, client_id)`)
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar propostas:', error);
        setProposals([]);
      } else {
        setProposals(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setProposals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'my_proposals') fetchMyProposals();
    else fetchTasks();
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      eletrica: '⚡', encanamento: '💧', pintura: '🎨',
      limpeza: '🧹', mudancas: '📦', ti: '💻', outros: '🔧',
    };
    return labels[category] || '📋';
  };

  const userName = profile?.user_type === 'company' ? profile.company_name : profile?.full_name || 'Utilizador';

  if (loading && tasks.length === 0 && proposals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.text.secondary }}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentData = activeTab === 'my_proposals' ? proposals : tasks;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Olá, {userName}!</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ padding: spacing.xs, marginRight: spacing.sm }}
            onPress={async () => {
              if (user?.id) {
                const { NotificationService } = await import('../../lib/notifications');
                await NotificationService.createTestNotification(user.id);
                alert('Notificação de teste criada! Verifica o console e o sino.');
              }
            }}
          >
            <Ionicons name="bug-outline" size={24} color={colors.error} />
          </TouchableOpacity>
          
          <NotificationBell />
          
          <TouchableOpacity style={styles.walletButton} onPress={() => router.push('/wallet')}>
            <Ionicons name="wallet-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'my' && styles.tabActive]} onPress={() => setActiveTab('my')}>
          <Ionicons name="briefcase-outline" size={18} color={activeTab === 'my' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>Minhas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.tabActive]} onPress={() => setActiveTab('available')}>
          <Ionicons name="search-outline" size={18} color={activeTab === 'available' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>Disponíveis</Text>
        </TouchableOpacity>

        {/* <-- NOVA ABA MAPA --> */}
        <TouchableOpacity style={[styles.tab, activeTab === 'map' && styles.tabActive]} onPress={() => setActiveTab('map')}>
          <Ionicons name="map-outline" size={18} color={activeTab === 'map' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'in_progress' && styles.tabActive]} onPress={() => setActiveTab('in_progress')}>
          <Ionicons name="time-outline" size={18} color={activeTab === 'in_progress' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]}>Em Curso</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.tabActive]} onPress={() => setActiveTab('completed')}>
          <Ionicons name="checkmark-circle-outline" size={18} color={activeTab === 'completed' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>Concluídas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'my_proposals' && styles.tabActive]} onPress={() => setActiveTab('my_proposals')}>
          <Ionicons name="document-text-outline" size={18} color={activeTab === 'my_proposals' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'my_proposals' && styles.tabTextActive]}>Propostas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'my_offers' && styles.tabActive]} onPress={() => router.push('/my-offers')}>
          <Ionicons name="mail-outline" size={18} color={activeTab === 'my_offers' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'my_offers' && styles.tabTextActive]}>Ofertas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <ScrollView 
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {/* <-- RENDERIZAÇÃO CONDICIONAL DO MAPA --> */}
          {activeTab === 'map' ? (
            <View style={{ flex: 1, minHeight: 500, width: '100%' }}>
              <TaskMap />
            </View>
          ) : currentData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyText}>
                {activeTab === 'my' && 'Você ainda não criou nenhuma tarefa'}
                {activeTab === 'available' && 'Nenhuma tarefa disponível no momento'}
                {activeTab === 'in_progress' && 'Nenhuma tarefa em andamento'}
                {activeTab === 'completed' && 'Nenhuma tarefa concluída ainda'}
                {activeTab === 'my_proposals' && 'Você ainda não enviou nenhuma proposta'}
              </Text>
            </View>
          ) : (
            currentData.map((item) => {
              if (activeTab === 'my_proposals') {
                return (
                  <TouchableOpacity key={item.id} style={styles.proposalCard} onPress={() => router.push({ pathname: '/task-details', params: { id: item.task?.id } })}>
                    <View style={styles.proposalHeader}>
                      <Text style={styles.taskIcon}>{getCategoryLabel(item.task?.category)}</Text>
                      <View style={[styles.proposalStatusBadge, item.status === 'pending' ? styles.pendingStatus : item.status === 'accepted' ? styles.acceptedStatus : styles.rejectedStatus]}>
                        <Text style={styles.proposalStatusText}>{item.status === 'pending' ? 'Pendente' : item.status === 'accepted' ? 'Aceita' : 'Rejeitada'}</Text>
                      </View>
                    </View>
                    <Text style={styles.proposalTitle} numberOfLines={2}>{item.task?.title}</Text>
                    <View style={styles.proposalDetails}>
                      <View style={styles.proposalDetail}><Ionicons name="cash-outline" size={14} color={colors.primary} /><Text style={styles.proposalDetailText}>{formatCurrency(item.price)}</Text></View>
                      <View style={styles.proposalDetail}><Ionicons name="time-outline" size={14} color={colors.primary} /><Text style={styles.proposalDetailText}>{item.deadline_days} dias</Text></View>
                    </View>
                    {item.status === 'rejected' && (
                      <View style={styles.rejectedBox}><Ionicons name="close-circle" size={16} color={colors.error} /><Text style={styles.rejectedText}>Proposta rejeitada</Text></View>
                    )}
                    {item.status === 'accepted' && (
                      <View style={styles.acceptedBox}><Ionicons name="checkmark-circle" size={16} color={colors.success} /><Text style={styles.acceptedText}>Proposta aceite! Clique para ver detalhes</Text></View>
                    )}
                  </TouchableOpacity>
                );
              } else {
                return (
                  <TouchableOpacity key={item.id} style={styles.taskCard} onPress={() => router.push({ pathname: '/task-details', params: { id: item.id } })}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskIcon}>{getCategoryLabel(item.category)}</Text>
                      <View style={[styles.statusBadge, item.status === 'open' ? styles.statusOpen : item.status === 'in_progress' ? styles.statusProgress : styles.statusCompleted]}>
                        <Text style={styles.statusText}>{item.status === 'open' ? 'Aberta' : item.status === 'in_progress' ? 'Em Andamento' : 'Concluída'}</Text>
                      </View>
                    </View>
                    <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.taskFooter}>
                      <View style={styles.taskFooterItem}><Ionicons name="location-outline" size={14} color={colors.text.secondary} /><Text style={styles.taskFooterText} numberOfLines={1}>{item.location}</Text></View>
                      <Text style={styles.taskBudget}>{formatCurrency(item.budget)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
            })
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/create-task')}>
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Nova Tarefa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/vacancies')}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Vagas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/hire-worker')}>
            <Ionicons name="person-add" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Contratar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/my-applications')}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Candidaturas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/my-contracts')}>
            <Ionicons name="file-tray" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Contratos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/create-recurring-task')}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.quickActionText}>Recorrente</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerDivider} />
        <Button title="Sair da Conta" onPress={handleLogout} variant="ghost" size="small" fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  profileButton: { padding: spacing.xs },
  walletButton: { padding: spacing.xs, marginRight: spacing.sm },
  welcomeText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text.primary },
  emailText: { fontSize: fontSize.sm, color: colors.text.secondary },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, gap: spacing.xs },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs },
  tabActive: { backgroundColor: colors.surfaceDark },
  tabText: { fontSize: fontSize.xs, color: colors.text.secondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  
  listContainer: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md, textAlign: 'center' },
  
  taskCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  taskIcon: { fontSize: fontSize.xl },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusOpen: { backgroundColor: '#DCFCE7' },
  statusProgress: { backgroundColor: '#FEF3C7' },
  statusCompleted: { backgroundColor: '#DBEAFE' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.success },
  taskTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskFooterItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  taskFooterText: { fontSize: fontSize.sm, color: colors.text.secondary },
  taskBudget: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
  
  proposalCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  proposalStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  pendingStatus: { backgroundColor: '#FEF3C7' },
  acceptedStatus: { backgroundColor: '#DCFCE7' },
  rejectedStatus: { backgroundColor: '#FEE2E2' },
  proposalStatusText: { fontSize: fontSize.xs, fontWeight: '600' },
  proposalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  proposalDetails: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  proposalDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  proposalDetailText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary },
  rejectedBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#FEE2E2', padding: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm },
  rejectedText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
  acceptedBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#DCFCE7', padding: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm },
  acceptedText: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  quickActionButton: { flex: 1, minWidth: '30%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surfaceDark, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md },
  quickActionText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  footerDivider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.sm },
});