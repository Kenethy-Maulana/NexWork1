// app/(tabs)/tasks.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Task } from '../../lib/supabase';
import { colors, fontSize, spacing, borderRadius, fontWeight } from '../../styles/theme';

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar tarefas:', error);
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      eletrica: 'flash-outline',
      encanamento: 'water-outline',
      pintura: 'color-palette-outline',
      limpeza: 'sparkles-outline',
      mudancas: 'cube-outline',
      ti: 'laptop-outline',
      outros: 'construct-outline',
    };
    return icons[category] || 'briefcase-outline';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/task-details', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Ionicons name={getCategoryIcon(item.category)} size={16} color={colors.primary} />
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'open' ? styles.statusOpen : styles.statusClosed]}>
          <Text style={styles.statusText}>
            {item.status === 'open' ? 'Aberta' : item.status === 'in_progress' ? 'Em Andamento' : 'Concluída'}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.footerText}>{item.location}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="cash-outline" size={16} color={colors.success} />
          <Text style={[styles.footerText, { color: colors.success, fontWeight: '700' as any }]}>
            {formatCurrency(item.budget)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando tarefas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tarefas Disponíveis</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>Nenhuma tarefa encontrada</Text>
            <Text style={styles.emptySubtext}>Seja o primeiro a criar uma tarefa!</Text>
            <TouchableOpacity 
              style={styles.emptyButton} 
              onPress={() => router.push('/create-task')}
            >
              <Text style={styles.emptyButtonText}>Criar Tarefa</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text.primary },
  addButton: { padding: spacing.xs },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceDark, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, gap: spacing.xs },
  categoryText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusOpen: { backgroundColor: '#DCFCE7' },
  statusClosed: { backgroundColor: colors.surfaceDark },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.success },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  description: { fontSize: fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerText: { fontSize: fontSize.sm, color: colors.text.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.text.secondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  emptyButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  emptyButtonText: { color: colors.surface, fontWeight: '600', fontSize: fontSize.md },
});