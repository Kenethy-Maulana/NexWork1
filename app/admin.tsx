// app/admin.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { AdminService, PlatformMetrics, AdvancedAnalytics } from '../lib/admin';
import { AdminAuthService } from '../lib/admin-auth';
import { supabase } from '../lib/supabase';

type AdminTab = 'overview' | 'finance' | 'analytics' | 'users' | 'disputes' | 'admins' | 'logs' | 'revenue';

export default function AdminScreen() {
  const router = useRouter();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);

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
      return Alert.alert('Erro', `Utilizador com email "${targetEmail}" não encontrado.`);
    }

    const adminEmail = window.prompt('Email de login do admin:', targetEmail);
    if (!adminEmail) return;

    const password = window.prompt('Password temporária (mín. 6 caracteres):');
    if (!password || password.length < 6) {
      return Alert.alert('Erro', 'Password deve ter pelo menos 6 caracteres.');
    }

    const role = window.prompt('Nível de acesso:\n1. super_admin\n2. finance_admin\n3. support_admin\n4. moderator\n5. viewer', 'support_admin');
    if (!role) return;

    const validRoles = ['super_admin', 'finance_admin', 'support_admin', 'moderator', 'viewer'];
    const finalRole = validRoles.includes(role) ? role : 'support_admin';

    const { data, error } = await AdminService.createAdmin(currentAdmin.user_id, profileData.id, adminEmail, password, finalRole);

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
      case 'revenue': data = revenue; filename = 'receitas_plataforma'; break;
    }
    AdminService.exportToCSV(data, filename);
    Alert.alert('✅ Exportado', `Ficheiro ${filename}.csv descarregado.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
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
    { id: 'revenue', label: `💎 Receita (${revenue.length})` },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>🛡️ NexWork Command Center</Text>
          <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
            {currentAdmin.role === 'super_admin' ? '👑 SUPER ADMIN' : currentAdmin.role.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={loadAllData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab.id as AdminTab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.text.secondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ✅ VISÃO GERAL */}
        {activeTab === 'overview' && metrics && (
          <View>
            <View style={styles.metricsGrid}>
              <MetricCard icon="people" label="Total Utilizadores" value={metrics.total_users} color={colors.primary} />
              <MetricCard icon="briefcase" label="Total Tarefas" value={metrics.total_tasks} color={colors.success} />
              <MetricCard icon="wallet" label="Volume Escrow" value={formatCurrency(metrics.total_escrow_volume)} color={colors.warning} />
              <MetricCard icon="star" label="Avaliação Média" value={`⭐ ${metrics.avg_rating}`} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Distribuição de Contas</Text>
            <View style={styles.metricsGrid}>
              <MetricCard icon="person" label="Individuais" value={metrics.total_individuals} color={colors.primary} />
              <MetricCard icon="business" label="Empresas" value={metrics.total_companies} color={colors.primary} />
              <MetricCard icon="ban" label="Banidos" value={metrics.banned_users} color={colors.error} />
            </View>
          </View>
        )}

        {/* ✅ FINANCEIRO */}
        {activeTab === 'finance' && (
          <View>
            <View style={styles.exportBox}>
              <Button title="📥 Exportar Relatório Financeiro (CSV)" onPress={() => handleExport('revenue')} variant="outline" size="medium" fullWidth />
            </View>
            <View style={[styles.financeSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 0 }]}>Resumo Financeiro</Text>
              <View style={styles.metricsGrid}>
                <MetricCard icon="wallet" label="Volume Total em Escrow" value={formatCurrency(metrics?.total_escrow_volume || 0)} color={colors.primary} />
                <MetricCard icon="trending-up" label="Receita da Plataforma" value={formatCurrency(revenue.reduce((sum: number, r: any) => sum + Number(r.commission_amount || 0), 0))} color={colors.success} />
              </View>
            </View>
            
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Últimas Transações</Text>
            {revenue.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={48} color={colors.text.light} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhuma transação financeira registada.</Text>
              </View>
            ) : (
              revenue.slice(0, 10).map((r: any) => (
                <View key={r.id} style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.logAction, { color: colors.success, fontWeight: '700' }]}>+ {formatCurrency(r.commission_amount)}</Text>
                    <Text style={[styles.logDate, { color: colors.text.secondary }]}>{new Date(r.created_at).toLocaleDateString('pt-MZ')}</Text>
                  </View>
                  <Text style={[styles.logDetails, { color: colors.text.primary, marginTop: 4 }]}>
                    Comissão de {r.commission_percent}% sobre {formatCurrency(r.original_amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ✅ ANALYTICS */}
        {activeTab === 'analytics' && (
          <View>
            {!analytics ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>A carregar dados de analytics...</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 0 }]}>Métricas de Desempenho</Text>
                <View style={styles.metricsGrid}>
                  <MetricCard icon="time" label="Tempo Médio de Conclusão" value={`${analytics.avg_completion_days || 0} dias`} color={colors.warning} />
                  <MetricCard icon="checkmark-circle" label="Taxa de Conclusão" value={`${analytics.completion_rate || 0}%`} color={colors.success} />
                  <MetricCard icon="star" label="Satisfação do Cliente" value={`${analytics.avg_client_rating || 0}/5`} color={colors.primary} />
                </View>
                
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Categorias Mais Procuradas</Text>
                <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {analytics?.top_categories && analytics.top_categories.length > 0 ? (
                    analytics.top_categories.map((item: any, idx: number) => (
                      <View key={item.category || idx} style={styles.analyticsRow}>
                        <Text style={[styles.analyticsLabel, { color: colors.text.primary }]}>
                          {idx + 1}. {item.category}
                        </Text>
                        <Text style={[styles.analyticsValue, { color: colors.primary }]}>
                          {item.count} tarefas
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: colors.text.secondary, padding: 16, textAlign: 'center' }}>
                      Dados de categorias indisponíveis.
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* ✅ UTILIZADORES */}
        {activeTab === 'users' && (
          <View>
            <View style={styles.exportBox}>
              <Button title="📥 Exportar Lista de Utilizadores (CSV)" onPress={() => handleExport('users')} variant="outline" size="medium" fullWidth />
            </View>
            {users.map((u) => (
              <View key={u.id} style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.userHeader}>
                  <View style={[styles.userAvatar, { backgroundColor: colors.surfaceLight }]}>
                    <Ionicons name={u.user_type === 'company' ? 'business' : 'person'} size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.text.primary }]}>
                      {u.full_name || u.company_name || 'Sem nome'}
                      {u.is_banned && <Text style={[styles.bannedBadge, { color: colors.error }]}> 🚫 BANIDO</Text>}
                    </Text>
                    <Text style={[styles.userMeta, { color: colors.text.secondary }]}>
                      {u.user_type === 'individual' ? '👤 Individual' : '🏢 Empresa'} • ⭐ {u.trust_score || 0}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.text.light }]}>{u.email}</Text>
                  </View>
                </View>
                {u.is_banned && (
                  <View style={[styles.banReason, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
                    <Text style={[styles.banReasonText, { color: colors.error }]}>Motivo: {u.ban_reason}</Text>
                  </View>
                )}
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

        {/* ✅ DISPUTAS */}
        {activeTab === 'disputes' && (
          <View>
            {disputes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhuma disputa pendente 🎉</Text>
              </View>
            ) : (
              disputes.map((d) => (
                <View key={d.id} style={[styles.disputeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.disputeHeader}>
                    <Ionicons name="warning" size={24} color={colors.error} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.disputeTitle, { color: colors.text.primary }]}>{d.task_title}</Text>
                      <Text style={[styles.disputeCategory, { color: colors.text.secondary }]}>{d.task_category} • {d.task_location}</Text>
                    </View>
                    <Text style={[styles.disputeAmount, { color: colors.error }]}>{formatCurrency(d.amount)}</Text>
                  </View>
                  <View style={[styles.disputeParties, { backgroundColor: colors.background }]}>
                    <Text style={[styles.partyName, { color: colors.text.primary }]}>👤 Cliente: {d.client_name}</Text>
                    <Text style={[styles.partyName, { color: colors.text.primary }]}>🔨 Trabalhador: {d.worker_name}</Text>
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

        {/* ✅ ADMINS (COM BOTÃO DE CRIAR NOVO) */}
        {activeTab === 'admins' && (
          <View>
            {/* ✅ BOTÃO DE CRIAR NOVO ADMIN (Visível apenas para Super Admin) */}
            {currentAdmin.role === 'super_admin' && (
              <View style={styles.exportBox}>
                <Button 
                  title="➕ Criar Novo Administrador" 
                  onPress={handleCreateAdmin} 
                  variant="primary" 
                  size="medium" 
                  fullWidth 
                />
              </View>
            )}
            
            {admins.map((a) => (
              <View key={a.id} style={[styles.adminCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.userHeader}>
                  <View style={[styles.userAvatar, { backgroundColor: a.role === 'super_admin' ? colors.error + '20' : colors.surfaceLight }]}>
                    <Ionicons name="shield" size={24} color={a.role === 'super_admin' ? colors.error : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.text.primary }]}>
                      {a.profile_name}
                      {!a.is_active && <Text style={[styles.inactiveBadge, { color: colors.text.secondary }]}> ⏸️ INATIVO</Text>}
                    </Text>
                    <Text style={[styles.userMeta, { color: colors.text.secondary }]}>🛡️ {a.role.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={[styles.userEmail, { color: colors.text.light }]}>{a.admin_email}</Text>
                  </View>
                </View>
                
                {/* Ações de Admin (Apenas Super Admin pode ativar/desativar outros admins) */}
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

        {/* ✅ LOGS */}
        {activeTab === 'logs' && (
          <View>
            {logs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={colors.text.light} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhum log registado</Text>
              </View>
            ) : (
              logs.map((log: any) => (
                <View key={log.id} style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.logHeader}>
                    <Ionicons name="time" size={16} color={colors.text.secondary} />
                    <Text style={[styles.logDate, { color: colors.text.secondary }]}>{new Date(log.created_at).toLocaleString('pt-MZ')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.logAction, { color: colors.primary }]}>{log.action.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={[styles.logAdmin, { color: colors.text.secondary }]}>{log.admin_email}</Text>
                  </View>
                  {log.details && <Text style={[styles.logDetails, { color: colors.text.primary }]}>{log.details}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        {/* ✅ RECEITA */}
        {activeTab === 'revenue' && (
          <View>
            <View style={styles.exportBox}>
              <Button title="📥 Exportar Receitas (CSV)" onPress={() => handleExport('revenue')} variant="outline" size="medium" fullWidth />
            </View>
            
            {revenue.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={64} color={colors.text.light} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Nenhuma receita registada ainda</Text>
              </View>
            ) : (
              <>
                <View style={[styles.revenueSummary, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                  <Text style={[styles.revenueSummaryLabel, { color: colors.success }]}>💰 Receita Total da Plataforma</Text>
                  <Text style={[styles.revenueSummaryValue, { color: colors.success }]}>
                    {formatCurrency(revenue.reduce((sum: number, r: any) => sum + Number(r.commission_amount), 0))}
                  </Text>
                  <Text style={[styles.revenueSummarySub, { color: colors.text.secondary }]}>
                    {revenue.length} transações • Média: {formatCurrency(revenue.reduce((sum: number, r: any) => sum + Number(r.commission_amount), 0) / (revenue.length || 1))}
                  </Text>
                </View>

                {revenue.map((r: any) => (
                  <View key={r.id} style={[styles.revenueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.revenueHeader}>
                      <Ionicons name="diamond" size={24} color={colors.success} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.revenueTitle, { color: colors.success }]}>Comissão: {formatCurrency(r.commission_amount)}</Text>
                        <Text style={[styles.revenueMeta, { color: colors.text.secondary }]}>
                          {r.commission_percent}% de {formatCurrency(r.original_amount)}
                        </Text>
                      </View>
                      <Text style={[styles.revenueDate, { color: colors.text.light }]}>
                        {new Date(r.created_at).toLocaleDateString('pt-MZ')}
                      </Text>
                    </View>
                    <View style={[styles.revenueDetails, { backgroundColor: colors.background }]}>
                      <Text style={[styles.revenueDetail, { color: colors.text.primary }]}>Trabalhador recebeu: {formatCurrency(r.worker_net_amount)}</Text>
                      <Text style={[styles.revenueDetail, { color: colors.text.primary }]}>Status: {r.status}</Text>
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
      <Text style={[styles.metricValue, { color: color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: color + '99' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '600' },
  refreshButton: { padding: 4 },
  tabsContainer: { borderBottomWidth: 1, paddingVertical: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metricCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  metricValue: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  metricLabel: { fontSize: 13, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },
  exportBox: { marginBottom: 16 },
  
  financeSummary: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  analyticsCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  analyticsLabel: { fontSize: 15, fontWeight: '500' },
  analyticsValue: { fontSize: 15, fontWeight: '700' },

  revenueSummary: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  revenueSummaryLabel: { fontSize: 14, fontWeight: '600' },
  revenueSummaryValue: { fontSize: 32, fontWeight: '800', marginVertical: 8 },
  revenueSummarySub: { fontSize: 12 },
  revenueCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  revenueTitle: { fontSize: 15, fontWeight: '700' },
  revenueMeta: { fontSize: 12, marginTop: 4 },
  revenueDate: { fontSize: 12 },
  revenueDetails: { padding: 12, borderRadius: 12, gap: 8 },
  revenueDetail: { fontSize: 14 },

  userCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 15, fontWeight: '700' },
  bannedBadge: { fontSize: 12, fontWeight: '700' },
  inactiveBadge: { fontSize: 12, fontWeight: '700' },
  userMeta: { fontSize: 12, marginTop: 4 },
  userEmail: { fontSize: 12, marginTop: 4 },
  banReason: { padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1 },
  banReasonText: { fontSize: 12 },
  userActions: { marginTop: 16 },
  adminCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  disputeCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  disputeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  disputeTitle: { fontSize: 15, fontWeight: '700' },
  disputeCategory: { fontSize: 12, marginTop: 4 },
  disputeAmount: { fontSize: 18, fontWeight: '700' },
  disputeParties: { padding: 12, borderRadius: 12, marginBottom: 12, gap: 8 },
  partyName: { fontSize: 14 },
  disputeActions: { gap: 12 },
  logCard: { padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  logDate: { fontSize: 12 },
  logAction: { fontSize: 14, fontWeight: '700' },
  logAdmin: { fontSize: 12, fontStyle: 'italic' },
  logDetails: { fontSize: 12, marginTop: 8 },
});