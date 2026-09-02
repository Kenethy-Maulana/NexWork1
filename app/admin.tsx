// app/admin.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { AdminService, PlatformMetrics, AdvancedAnalytics } from '../lib/admin';
import { AdminAuthService } from '../lib/admin-auth';
import { supabase } from '../lib/supabase';

type AdminTab = 'overview' | 'finance' | 'analytics' | 'users' | 'disputes' | 'admins' | 'logs' | 'revenue';

export default function AdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]); // NOVO ESTADO

  useEffect(() => {
    const checkAccess = async () => {
      const adminData = await AdminAuthService.getCurrentAdmin();
      if (!adminData) {
        router.replace('/admin-login');
        return;
      }
      setCurrentAdmin(adminData);
      await loadAllData();
      setLoading(false);
    };
    checkAccess();
  }, []);

  const loadAllData = async () => {
    // Adicionada a busca de receitas
    const [m, a, d, u, l, adm, rev] = await Promise.all([
      AdminService.getMetrics(),
      AdminService.getAdvancedAnalytics(),
      AdminService.getDisputes(),
      AdminService.getAllUsers(),
      AdminService.getAdminLogs(),
      AdminService.getAllAdmins(),
      supabase.from('platform_revenue').select('*').order('created_at', { ascending: false }),
    ]);
    setMetrics(m);
    setAnalytics(a);
    setDisputes(d);
    setUsers(u);
    setLogs(l);
    setAdmins(adm);
    setRevenue(rev.data || []);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);

  const handleResolveDispute = async (escrowId: string, resolution: 'release_to_worker' | 'refund_to_client' | 'split') => {
    const labels = { release_to_worker: 'LIBERAR AO TRABALHADOR', refund_to_client: 'REEMBOLSAR AO CLIENTE', split: 'DIVIDIR 50/50' };
    if (!window.confirm(`Confirmar: ${labels[resolution]}?`)) return;
    const notes = window.prompt('Notas da resolução (obrigatório):') || 'Sem notas';
    
    const success = await AdminService.resolveDispute(currentAdmin.user_id, escrowId, resolution, notes);
    if (success) {
      Alert.alert('✅ Sucesso', 'Disputa resolvida.');
      await loadAllData();
    } else {
      Alert.alert('❌ Erro', 'Falha ao resolver disputa. Verifica o console.');
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    const reason = window.prompt(`Motivo para banir ${userName}:`);
    if (!reason?.trim()) return Alert.alert('Erro', 'Motivo é obrigatório.');
    if (!window.confirm(`Banir ${userName}? Esta ação é severa.`)) return;
    
    const success = await AdminService.banUser(currentAdmin.user_id, userId, reason);
    if (success) {
      Alert.alert('✅ Sucesso', 'Utilizador banido.');
      await loadAllData();
    } else {
      Alert.alert('❌ Erro', 'Falha ao banir utilizador.');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    const success = await AdminService.unbanUser(currentAdmin.user_id, userId);
    if (success) {
      Alert.alert('✅ Sucesso', 'Utilizador reabilitado.');
      await loadAllData();
    }
  };

  const handleCreateAdmin = async () => {
    if (currentAdmin.role !== 'super_admin') {
      return Alert.alert('Erro', 'Apenas Super Admin pode criar outros administradores.');
    }

    const targetEmail = window.prompt('Email do utilizador (já deve existir na plataforma):');
    if (!targetEmail) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', targetEmail.trim())
      .single();

    if (profileError || !profileData) {
      console.error('Erro ao buscar perfil:', profileError);
      return Alert.alert('Erro', `Utilizador com email "${targetEmail}" não encontrado. Verifica se digitaste corretamente.`);
    }

    const adminEmail = window.prompt('Email de login do admin:', targetEmail);
    if (!adminEmail) return;

    const password = window.prompt('Password temporária (mín. 6 caracteres):');
    if (!password || password.length < 6) {
      return Alert.alert('Erro', 'Password deve ter pelo menos 6 caracteres.');
    }

    const role = window.prompt(
      'Nível de acesso:\n1. super_admin\n2. finance_admin\n3. support_admin\n4. moderator\n5. viewer',
      'support_admin'
    );
    if (!role) return;

    const validRoles = ['super_admin', 'finance_admin', 'support_admin', 'moderator', 'viewer'];
    const finalRole = validRoles.includes(role) ? role : 'support_admin';

    const { data, error } = await AdminService.createAdmin(
      currentAdmin.user_id,
      profileData.id,
      adminEmail,
      password,
      finalRole
    );

    if (error || !data?.success) {
      console.error('Erro ao criar admin:', error, data);
      Alert.alert('Erro', data?.message || error?.message || 'Falha ao criar admin');
    } else {
      Alert.alert('✅ Sucesso', `Admin criado!\nEmail: ${adminEmail}\nPassword: ${password}\nRole: ${finalRole}`);
      await loadAllData();
    }
  };

  const handleToggleAdmin = async (adminId: string, currentActive: boolean) => {
    const action = currentActive ? 'desativar' : 'ativar';
    if (!window.confirm(`Confirmar ${action} deste administrador?`)) return;
    
    const { error } = await AdminService.toggleAdminStatus(adminId, !currentActive);
    if (!error) {
      Alert.alert('✅ Sucesso', `Admin ${action}do.`);
      await loadAllData();
    } else {
      Alert.alert('❌ Erro', 'Falha ao alterar estado do admin.');
    }
  };

  const handleExport = (type: string) => {
    let data: any[] = [];
    let filename = '';
    switch (type) {
      case 'users': data = users; filename = 'utilizadores'; break;
      case 'disputes': data = disputes; filename = 'disputas'; break;
      case 'logs': data = logs; filename = 'logs_auditoria'; break;
      case 'admins': data = admins; filename = 'administradores'; break;
      case 'revenue': data = revenue; filename = 'receitas_plataforma'; break; // NOVO
    }
    AdminService.exportToCSV(data, filename);
    Alert.alert('✅ Exportado', `Ficheiro ${filename}.csv descarregado.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.text.secondary }}>A carregar Centro de Comando...</Text>
      </SafeAreaView>
    );
  }

  if (!currentAdmin) return null;

  const tabs = [
    { id: 'overview', label: '📊 Visão Geral' },
    { id: 'finance', label: '💰 Finanças' },
    { id: 'analytics', label: '📈 Analytics' },
    { id: 'users', label: `👥 Users (${users.length})` },
    { id: 'disputes', label: `⚖️ Disputas (${disputes.length})` },
    { id: 'admins', label: `🛡️ Admins (${admins.length})` },
    { id: 'logs', label: `📜 Logs` },
    { id: 'revenue', label: `💎 Receita (${revenue.length})` }, // NOVO
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🛡️ NexWork Command Center</Text>
          <Text style={styles.headerSubtitle}>
            {currentAdmin.role === 'super_admin' ? '👑 SUPER ADMIN (God Mode)' : currentAdmin.role.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={loadAllData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as AdminTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && metrics && (
          <View>
            <View style={styles.metricsGrid}>
              <MetricCard icon="people" label="Total Utilizadores" value={metrics.total_users} color="#6366F1" />
              <MetricCard icon="briefcase" label="Total Tarefas" value={metrics.total_tasks} color="#10B981" />
              <MetricCard icon="wallet" label="Volume Escrow" value={formatCurrency(metrics.total_escrow_volume)} color="#F59E0B" />
              <MetricCard icon="star" label="Avaliação Média" value={`⭐ ${metrics.avg_rating}`} color="#EC4899" />
            </View>
            <Text style={styles.sectionTitle}>Distribuição de Contas</Text>
            <View style={styles.metricsGrid}>
              <MetricCard icon="person" label="Individuais" value={metrics.total_individuals} color="#3B82F6" />
              <MetricCard icon="business" label="Empresas" value={metrics.total_companies} color="#8B5CF6" />
              <MetricCard icon="ban" label="Banidos" value={metrics.banned_users} color="#EF4444" />
            </View>
          </View>
        )}

        {activeTab === 'users' && (
          <View>
            <View style={styles.exportBox}>
              <Button title="📥 Exportar Lista de Utilizadores (CSV)" onPress={() => handleExport('users')} variant="outline" size="medium" fullWidth />
            </View>
            {users.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Ionicons name={u.user_type === 'company' ? 'business' : 'person'} size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>
                      {u.full_name || u.company_name || 'Sem nome'}
                      {u.is_banned && <Text style={styles.bannedBadge}> 🚫 BANIDO</Text>}
                    </Text>
                    <Text style={styles.userMeta}>
                      {u.user_type === 'individual' ? '👤 Individual' : '🏢 Empresa'} • ⭐ {u.trust_score || 0}
                    </Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                  </View>
                </View>
                {u.is_banned && <View style={styles.banReason}><Text style={styles.banReasonText}>Motivo: {u.ban_reason}</Text></View>}
                <View style={styles.userActions}>
                  {u.is_banned ? (
                    <Button title="Reabilitar" onPress={() => handleUnbanUser(u.id)} variant="outline" size="small" fullWidth />
                  ) : (
                    <Button title="🚫 Banir" onPress={() => handleBanUser(u.id, u.full_name || u.company_name)} variant="ghost" size="small" fullWidth />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'disputes' && (
          <View>
            {disputes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                <Text style={styles.emptyText}>Nenhuma disputa pendente 🎉</Text>
              </View>
            ) : (
              disputes.map((d) => (
                <View key={d.id} style={styles.disputeCard}>
                  <View style={styles.disputeHeader}>
                    <Ionicons name="warning" size={24} color={colors.error} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.disputeTitle}>{d.task_title}</Text>
                      <Text style={styles.disputeCategory}>{d.task_category} • {d.task_location}</Text>
                    </View>
                    <Text style={styles.disputeAmount}>{formatCurrency(d.amount)}</Text>
                  </View>
                  <View style={styles.disputeParties}>
                    <Text style={styles.partyName}>👤 Cliente: {d.client_name}</Text>
                    <Text style={styles.partyName}>🔨 Trabalhador: {d.worker_name}</Text>
                  </View>
                  <View style={styles.disputeActions}>
                    <Button title="✅ Liberar Trabalhador" onPress={() => handleResolveDispute(d.id, 'release_to_worker')} variant="primary" size="small" fullWidth />
                    <Button title="↩️ Reembolsar Cliente" onPress={() => handleResolveDispute(d.id, 'refund_to_client')} variant="outline" size="small" fullWidth />
                    <Button title="⚖️ Dividir 50/50" onPress={() => handleResolveDispute(d.id, 'split')} variant="ghost" size="small" fullWidth />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'admins' && (
          <View>
            {currentAdmin.role === 'super_admin' && (
              <View style={styles.exportBox}>
                <Button title="➕ Criar Novo Administrador" onPress={handleCreateAdmin} variant="primary" size="medium" fullWidth />
              </View>
            )}
            {admins.map((a) => (
              <View key={a.id} style={styles.adminCard}>
                <View style={styles.userHeader}>
                  <View style={[styles.userAvatar, { backgroundColor: a.role === 'super_admin' ? '#FEE2E2' : colors.surfaceDark }]}>
                    <Ionicons name="shield" size={24} color={a.role === 'super_admin' ? colors.error : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>
                      {a.profile_name}
                      {!a.is_active && <Text style={styles.inactiveBadge}> ⏸️ INATIVO</Text>}
                    </Text>
                    <Text style={styles.userMeta}>🛡️ {a.role.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={styles.userEmail}>{a.admin_email}</Text>
                  </View>
                </View>
                {currentAdmin.role === 'super_admin' && a.id !== currentAdmin.id && (
                  <View style={styles.userActions}>
                    <Button 
                      title={a.is_active ? '⏸️ Desativar' : '▶️ Ativar'} 
                      onPress={() => handleToggleAdmin(a.id, a.is_active)} 
                      variant={a.is_active ? 'ghost' : 'outline'} 
                      size="small" 
                      fullWidth 
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'logs' && (
          <View>
            {logs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={colors.text.light} />
                <Text style={styles.emptyText}>Nenhum log registado</Text>
              </View>
            ) : (
              logs.map((log: any) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Ionicons name="time" size={16} color={colors.text.secondary} />
                    <Text style={styles.logDate}>{new Date(log.created_at).toLocaleString('pt-MZ')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.logAction}>{log.action.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.logAdmin}>{log.admin_email}</Text>
                  </View>
                  {log.details && <Text style={styles.logDetails}>📝 {log.details}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        {/* NOVA ABA: RECEITAS DA PLATAFORMA */}
        {activeTab === 'revenue' && (
          <View>
            <View style={styles.exportBox}>
              <Button title="📥 Exportar Receitas (CSV)" onPress={() => handleExport('revenue')} variant="outline" size="medium" fullWidth />
            </View>
            
            {revenue.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={64} color={colors.text.light} />
                <Text style={styles.emptyText}>Nenhuma receita registada ainda</Text>
              </View>
            ) : (
              <>
                <View style={styles.revenueSummary}>
                  <Text style={styles.revenueSummaryLabel}>💰 Receita Total da Plataforma</Text>
                  <Text style={styles.revenueSummaryValue}>
                    {formatCurrency(revenue.reduce((sum: number, r: any) => sum + Number(r.commission_amount), 0))}
                  </Text>
                  <Text style={styles.revenueSummarySub}>
                    {revenue.length} transações • Média: {formatCurrency(revenue.reduce((sum: number, r: any) => sum + Number(r.commission_amount), 0) / revenue.length)}
                  </Text>
                </View>

                {revenue.map((r: any) => (
                  <View key={r.id} style={styles.revenueCard}>
                    <View style={styles.revenueHeader}>
                      <Ionicons name="diamond" size={24} color={colors.success} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.revenueTitle}>Comissão: {formatCurrency(r.commission_amount)}</Text>
                        <Text style={styles.revenueMeta}>
                          {r.commission_percent}% de {formatCurrency(r.original_amount)}
                        </Text>
                      </View>
                      <Text style={styles.revenueDate}>
                        {new Date(r.created_at).toLocaleDateString('pt-MZ')}
                      </Text>
                    </View>
                    <View style={styles.revenueDetails}>
                      <Text style={styles.revenueDetail}>Trabalhador recebeu: {formatCurrency(r.worker_net_amount)}</Text>
                      <Text style={styles.revenueDetail}>Status: {r.status}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, color }: any) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  refreshButton: { padding: spacing.xs },
  tabsContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  content: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginTop: spacing.lg, marginBottom: spacing.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  metricValue: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text.primary, marginTop: spacing.xs },
  metricLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
  exportBox: { marginBottom: spacing.md },
  
  // Estilos de Receita (NOVOS)
  revenueSummary: { backgroundColor: '#DCFCE7', padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.success, alignItems: 'center', marginBottom: spacing.lg },
  revenueSummaryLabel: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  revenueSummaryValue: { fontSize: 32, fontWeight: '800', color: colors.success, marginVertical: spacing.sm },
  revenueSummarySub: { fontSize: fontSize.xs, color: colors.text.secondary },
  revenueCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  revenueTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
  revenueMeta: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  revenueDate: { fontSize: fontSize.xs, color: colors.text.light },
  revenueDetails: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.xs },
  revenueDetail: { fontSize: fontSize.sm, color: colors.text.primary },

  userCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  bannedBadge: { color: colors.error, fontSize: fontSize.xs, fontWeight: '700' },
  inactiveBadge: { color: colors.text.secondary, fontSize: fontSize.xs, fontWeight: '700' },
  userMeta: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  userEmail: { fontSize: fontSize.xs, color: colors.text.light, marginTop: spacing.xs },
  banReason: { backgroundColor: '#FEE2E2', padding: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm },
  banReasonText: { fontSize: fontSize.xs, color: colors.error },
  userActions: { marginTop: spacing.md },
  adminCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  disputeCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  disputeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  disputeTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  disputeCategory: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  disputeAmount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.error },
  disputeParties: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md, gap: spacing.xs },
  partyName: { fontSize: fontSize.sm, color: colors.text.primary },
  disputeActions: { gap: spacing.sm },
  logCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  logDate: { fontSize: fontSize.xs, color: colors.text.secondary },
  logAction: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  logAdmin: { fontSize: fontSize.xs, color: colors.text.secondary, fontStyle: 'italic' },
  logDetails: { fontSize: fontSize.xs, color: colors.text.primary, marginTop: spacing.xs },
});