// app/(tabs)/tasks.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Task } from '../../lib/supabase';
import { useTheme } from '../../styles/theme';

export default function TasksScreen() {
  const router = useRouter();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (!error) setTasks(data || []);
    } catch (err) { console.error('Erro inesperado:', err); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchTasks(); };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = { eletrica: 'flash-outline', encanamento: 'water-outline', pintura: 'color-palette-outline', limpeza: 'sparkles-outline', mudancas: 'cube-outline', ti: 'laptop-outline', outros: 'construct-outline' };
    return icons[category] || 'briefcase-outline';
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7} onPress={() => router.push({ pathname: '/task-details', params: { id: item.id } })}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name={getCategoryIcon(item.category)} size={16} color={colors.primary} />
          <Text style={[styles.categoryText, { color: colors.primary }]}>{item.category.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'open' ? colors.success + '20' : colors.surfaceLight }]}>
          <Text style={[styles.statusText, { color: item.status === 'open' ? colors.success : colors.text.secondary }]}>
            {item.status === 'open' ? 'Aberta' : item.status === 'in_progress' ? 'Em Andamento' : 'Concluída'}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={2}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.text.secondary }]} numberOfLines={2}>{item.description}</Text>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>{item.location}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="cash-outline" size={16} color={colors.success} />
          <Text style={[styles.footerText, { color: colors.success, fontWeight: '700' }]}>{formatCurrency(item.budget)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary, marginTop: spacing.md }]}>Carregando tarefas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Tarefas Disponíveis</Text>
        <TouchableOpacity onPress={() => router.push('/create-task')} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={colors.text.light} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>Nenhuma tarefa encontrada</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>Sê o primeiro a criar uma tarefa!</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/create-task')}>
              <Text style={[styles.emptyButtonText, { color: '#FFFFFF' }]}>Criar Tarefa</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  addButton: { padding: 4 },
  listContent: { padding: 20, paddingBottom: 32 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6, lineHeight: 24 },
  description: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtext: { fontSize: 15, marginTop: 8, marginBottom: 24 },
  emptyButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  emptyButtonText: { fontWeight: '700', fontSize: 16 },
});