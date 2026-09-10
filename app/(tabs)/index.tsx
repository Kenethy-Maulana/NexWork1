// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/NotificationBell';
import TaskMap from '../../components/TaskMap';

type TabType = 'my' | 'available' | 'in_progress' | 'completed' | 'my_proposals' | 'map';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { colors } = useTheme();
  const windowWidth = Dimensions.get('window').width;
  
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [tasks, setTasks] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'my_proposals') fetchMyProposals();
    else fetchTasks();
  }, [activeTab, user]);

  // ✅ FUNÇÃO ATUALIZADA: Busca tanto tarefas normais quanto recorrentes
  const fetchTasks = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Buscar tarefas normais
      let query = supabase.from('tasks').select('*');
      switch (activeTab) {
        case 'my': query = query.eq('client_id', user.id); break;
        case 'available': query = query.eq('status', 'open').neq('client_id', user.id); break;
        case 'in_progress': {
          const { data } = await supabase.from('proposals').select('task_id').eq('worker_id', user.id).eq('status', 'accepted');
          const ids = data?.map(p => p.task_id) || [];
          let orCond = `client_id.eq.${user.id}`;
          if (ids.length > 0) orCond += `,id.in.(${ids.join(',')})`;
          query = query.eq('status', 'in_progress').or(orCond);
          break;
        }
        case 'completed': {
          const { data } = await supabase.from('proposals').select('task_id').eq('worker_id', user.id).eq('status', 'accepted');
          const ids = data?.map(p => p.task_id) || [];
          let orCond = `client_id.eq.${user.id}`;
          if (ids.length > 0) orCond += `,id.in.(${ids.join(',')})`;
          query = query.eq('status', 'completed').or(orCond);
          break;
        }
      }
      const { data: regularTasks, error } = await query.order('created_at', { ascending: false });
      
      // 2. Buscar tarefas recorrentes (apenas na aba "Minhas")
      let recurringTasks = [];
      if (activeTab === 'my') {
        const { data: rData } = await supabase
          .from('recurring_tasks')
          .select('*')
          .eq('client_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        // Adicionamos uma flag para a UI saber que é recorrente
        recurringTasks = (rData || []).map(t => ({ ...t, is_recurring: true }));
      }

      // 3. Combinar e ordenar por data (mais recentes primeiro)
      const combinedData = [...(regularTasks || []), ...recurringTasks].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (!error) setTasks(combinedData);
    } catch (err) { console.error('Erro inesperado:', err); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchMyProposals = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('proposals').select(`*, task:tasks!task_id(id, title, category, location, budget, status)`).eq('worker_id', user.id).order('created_at', { ascending: false });
      if (!error) setProposals(data || []);
    } catch (err) { console.error('Erro:', err); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    activeTab === 'my_proposals' ? fetchMyProposals() : fetchTasks();
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = { eletrica: '', encanamento: '💧', pintura: '🎨', limpeza: '🧹', mudancas: '📦', ti: '💻', outros: '🔧' };
    return labels[category] || '📋';
  };

  const userName = profile?.user_type === 'company' ? profile.company_name : profile?.full_name || 'Utilizador';

  if (loading && tasks.length === 0 && proposals.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentData = activeTab === 'my_proposals' ? proposals : tasks;
  
  const filters: { id: TabType; label: string }[] = [
    { id: 'my', label: 'Minhas' },
    { id: 'available', label: 'Disponíveis' },
    { id: 'map', label: 'Mapa' },
    { id: 'in_progress', label: 'Em Curso' },
    { id: 'completed', label: 'Concluídas' },
    { id: 'my_proposals', label: 'Propostas' },
  ];

  const menuItems = [
    { icon: 'home', label: 'Início', route: '/' },
    { icon: 'briefcase', label: 'Vagas', route: '/vacancies' },
    { icon: 'people', label: 'Candidaturas', route: '/my-applications' },
    { icon: 'file-tray', label: 'Contratos', route: '/my-contracts' },
    { icon: 'add-circle', label: 'Nova Tarefa', route: '/create-task' },
    { icon: 'person-add', label: 'Contratar', route: '/hire-worker' },
    { icon: 'log-out', label: 'Sair', action: handleLogout, danger: true },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* MENU LATERAL (SIDEBAR) */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View 
            style={[styles.menuSidebar, { backgroundColor: colors.surface, width: windowWidth * 0.75 }]} 
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: colors.text.primary }]}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.menuContent}>
              {menuItems.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                    item.danger && { backgroundColor: colors.error + '10' }
                  ]}
                  onPress={() => {
                    setShowMenu(false);
                    if (item.action) item.action();
                    else if (item.route) router.push(item.route as any);
                  }}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color={item.danger ? colors.error : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.menuItemText,
                    { color: item.danger ? colors.error : colors.text.primary }
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text.secondary }]}>Olá,</Text>
          <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>{userName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <NotificationBell />
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surfaceLight }]} onPress={() => router.push('/wallet')}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surfaceLight }]} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTROS */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersContainer} 
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {filters.map((f) => {
          const isActive = activeTab === f.id;
          return (
            <TouchableOpacity 
              key={f.id} 
              style={[
                styles.filterPill, 
                { 
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: 1
                }
              ]} 
              onPress={() => setActiveTab(f.id)}
              activeOpacity={0.7}
            >
              <Text style={{ color: isActive ? '#FFFFFF' : colors.text.secondary, fontWeight: isActive ? '600' : '500', fontSize: 13 }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ÁREA PRINCIPAL (FLEX 1) */}
      <View style={styles.mainContent}>
        {activeTab === 'map' ? (
          <View style={{ flex: 1, width: '100%' }}>
            <TaskMap />
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.listContent} 
            showsVerticalScrollIndicator={false} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          >
            {currentData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="layers-outline" size={48} color={colors.text.light} />
                <Text style={[styles.emptyText, { color: colors.text.primary }]}>
                  {activeTab === 'my' && 'Nenhuma tarefa criada ainda.'}
                  {activeTab === 'available' && 'Sem tarefas disponíveis.'}
                  {activeTab === 'in_progress' && 'Nenhuma tarefa em andamento.'}
                  {activeTab === 'completed' && 'Nenhuma tarefa concluída.'}
                  {activeTab === 'my_proposals' && 'Ainda não enviaste propostas.'}
                </Text>
              </View>
            ) : (
              currentData.map((item) => {
                const isProposal = activeTab === 'my_proposals';
                const display = isProposal ? item.task : item;
                
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                    onPress={() => router.push({ pathname: '/task-details', params: { id: isProposal ? display?.id : item.id } })} 
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.catIcon, { backgroundColor: colors.surfaceLight }]}>
                        <Text style={{ fontSize: 18 }}>{getCategoryLabel(display?.category)}</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {/* ✅ NOVO: Badge de Tarefa Recorrente */}
                        {item.is_recurring && (
                          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="repeat" size={12} color={colors.primary} />
                            <Text style={[styles.badgeText, { color: colors.primary }]}>Recorrente</Text>
                          </View>
                        )}

                        <View style={[
                          styles.badge, 
                          { backgroundColor: isProposal 
                            ? (item.status === 'pending' ? colors.warning + '20' : item.status === 'accepted' ? colors.success + '20' : colors.error + '20')
                            : (item.status === 'open' ? colors.success + '20' : item.status === 'in_progress' ? colors.warning + '20' : colors.primary + '20')
                          }
                        ]}>
                          <Text style={[
                            styles.badgeText, 
                            { color: isProposal 
                              ? (item.status === 'pending' ? colors.warning : item.status === 'accepted' ? colors.success : colors.error)
                              : (item.status === 'open' ? colors.success : item.status === 'in_progress' ? colors.warning : colors.primary)
                            }
                          ]}>
                            {isProposal 
                              ? (item.status === 'pending' ? 'Pendente' : item.status === 'accepted' ? 'Aceite' : 'Rejeitado')
                              : (item.status === 'open' ? 'Aberta' : item.status === 'in_progress' ? 'Em Curso' : 'Concluída')
                            }
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={2}>
                      {display?.title}
                    </Text>
                    
                    <View style={styles.cardBottom}>
                      <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                        <Text style={[styles.locText, { color: colors.text.secondary }]} numberOfLines={1}>{display?.location}</Text>
                      </View>
                      <Text style={[styles.price, { color: colors.success }]}>
                        {formatCurrency(isProposal ? item.price : item.budget)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Menu Overlay
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  menuSidebar: {
    flex: 1,
    maxHeight: '100%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  menuContent: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16
  },
  menuButton: {
    padding: 4,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  iconBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  // Filtros
  filtersContainer: { flexGrow: 0, paddingVertical: 12 },
  filterPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  
  mainContent: { flex: 1 },
  
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 16, textAlign: 'center', lineHeight: 22 },
  
  card: { 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 10, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 4, 
    elevation: 2 
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, lineHeight: 20 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 10 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 },
  locText: { fontSize: 12 },
  price: { fontSize: 15, fontWeight: '700' },
});