// app/task-details.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Task, Proposal } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';
import ChatBox from '../components/ChatBox';

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: taskData, error: taskError } = await supabase.from('tasks').select('*').eq('id', id).single();
      if (taskError || !taskData) {
        alert('Tarefa não encontrada');
        router.replace('/(tabs)');
        return;
      }
      setTask(taskData);
      
      const { data: profileData } = await supabase.from('profiles').select('full_name, company_name, user_type, avatar_url').eq('id', taskData.client_id).single();
      setClientProfile(profileData);

      const { data: proposalsData } = await supabase.from('proposals').select(`*, worker:profiles!worker_id(full_name, company_name, avatar_url, trust_score, level, user_type)`).eq('task_id', id).order('created_at', { ascending: false });
      setProposals(proposalsData || []);

      const { data: reviewsData } = await supabase.from('reviews').select(`*, reviewer:profiles!reviewer_id(full_name, company_name, user_type)`).eq('task_id', id);
      setReviews(reviewsData || []);

      const { data: escrowData } = await supabase.from('escrow_payments').select('status').eq('task_id', id).maybeSingle();
      setEscrowStatus(escrowData?.status || null);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados da tarefa.');
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  // CLIENTE: Deposita em escrow e inicia o trabalho
  const handleDepositEscrow = async () => {
    if (!acceptedProposal || !task) return;

    const confirmed = window.confirm(`Depositar ${formatCurrency(acceptedProposal.price)} em Escrow?\n\nO dinheiro será bloqueado e o trabalho começará.`);
    if (!confirmed) return;
    
    try {
      const { PaySuiteService, WalletService } = await import('../lib/paysuite');
      
      const currentBalance = await WalletService.getBalance(user!.id);
      if (currentBalance < acceptedProposal.price) {
        alert(`Saldo insuficiente. Você tem ${formatCurrency(currentBalance)}. Adicione fundos primeiro.`);
        return;
      }
      
      const debitSuccess = await WalletService.debitWallet(user!.id, acceptedProposal.price, `Bloqueio em Escrow: ${task.title}`);
      if (!debitSuccess) {
        alert('Erro ao debitar saldo.');
        return;
      }
      
      const result = await PaySuiteService.createEscrow({
        amount: acceptedProposal.price,
        currency: 'MZN',
        method: 'wallet_balance',
        description: `Escrow: ${task.title}`,
        referenceId: String(id),
      });
      
      if (result.success) {
        await supabase.from('escrow_payments').insert({
          task_id: id,
          client_id: user!.id,
          worker_id: acceptedProposal.worker_id,
          amount: acceptedProposal.price,
          status: 'held',
          payment_method: 'wallet_balance',
          paysuite_transaction_id: result.transactionId,
        });
        
        await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', id);
        
        await NotificationService.createNotification(
          acceptedProposal.worker_id,
          'escrow_created',
          'Pagamento em Escrow Criado! 🔒',
          `O cliente depositou o valor para "${task.title}". O trabalho pode começar!`,
          String(id),
          'task'
        );
        
        setEscrowStatus('held');
        alert('✅ Pagamento em Escrow criado! O trabalho pode começar.');
        fetchAll();
      }
    } catch (err: any) {
      console.error('Erro no Escrow:', err);
      alert('Erro: ' + err.message);
    }
  };

  // TRABALHADOR: Solicita conclusão
  const handleWorkerRequestCompletion = async () => {
    if (!task) return;

    const confirmed = window.confirm('Solicitar Conclusão?\n\nO cliente será notificado para inspecionar o trabalho.');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', id);
      if (error) throw error;
      
      await NotificationService.createNotification(
        task.client_id,
        'task_completed',
        'Trabalho Concluído! ✅',
        `O trabalhador solicitou a conclusão de "${task.title}". Por favor, inspecione e aprove o pagamento.`,
        String(id),
        'task'
      );

      alert('✅ Solicitação enviada! Aguarde a aprovação do cliente.');
      fetchAll();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  // CLIENTE: Aprova e libera pagamento (COM COMISSÃO AUTOMÁTICA DE 10%)
  const handleClientApproveAndRelease = async () => {
    if (!task || !acceptedProposal) return;

    const confirmed = window.confirm(
      `Aprovar Trabalho e Liberar Pagamento?\n\n` +
      `Valor do Escrow: ${formatCurrency(acceptedProposal.price)}\n` +
      `Comissão NexWork (10%): ${formatCurrency(acceptedProposal.price * 0.10)}\n` +
      `Trabalhador receberá: ${formatCurrency(acceptedProposal.price * 0.90)}\n\n` +
      `O valor líquido será transferido para a carteira do trabalhador.`
    );
    if (!confirmed) return;

    try {
      // Usar a nova função SQL que calcula a comissão automaticamente
      const { data, error } = await supabase.rpc('process_escrow_release', {
        p_escrow_id: escrowStatus === 'held' ? (await supabase.from('escrow_payments').select('id').eq('task_id', id).eq('status', 'held').single()).data?.id : null,
        p_commission_percent: 10 // 10% de comissão
      });

      if (error) {
        console.error('Erro ao liberar pagamento:', error);
        alert('Erro: ' + error.message);
        return;
      }

      if (!data?.success) {
        alert('❌ ' + (data?.message || 'Falha ao liberar pagamento'));
        return;
      }

      // Notificar o trabalhador
      await NotificationService.createNotification(
        acceptedProposal.worker_id,
        'escrow_released',
        'Pagamento Liberado! 💰',
        `O cliente aprovou o trabalho. Valor creditado: ${formatCurrency(data.worker_net_amount)} (após comissão de 10%).`,
        String(id),
        'task'
      );

      alert(
        `✅ Pagamento liberado com sucesso!\n\n` +
        `Comissão NexWork: ${formatCurrency(data.commission_amount)}\n` +
        `Trabalhador recebeu: ${formatCurrency(data.worker_net_amount)}`
      );

      const wName = acceptedProposal.worker?.user_type === 'company' 
        ? (acceptedProposal.worker?.company_name || 'Empresa') 
        : (acceptedProposal.worker?.full_name || 'Trabalhador');
      router.push({ pathname: '/review', params: { taskId: id, reviewedId: acceptedProposal.worker_id, reviewedName: wName } });
      
      fetchAll();
    } catch (err: any) {
      console.error('Erro ao liberar pagamento:', err);
      alert('Erro: ' + err.message);
    }
  };

  // CLIENTE: Abre disputa
  const handleClientOpenDispute = async () => {
    if (!task) return;

    const reason = window.prompt('Descreva o problema:\n\nNota: O valor ficará congelado. Disputas falsas podem resultar em banimento.');
    if (!reason || reason.trim() === '') {
      alert('Por favor, descreva o motivo.');
      return;
    }

    const confirmed = window.confirm('Confirmar Abertura de Disputa?\n\nO valor será congelado até a administração analisar.');
    if (!confirmed) return;

    try {
      await supabase.from('escrow_payments').update({ status: 'disputed' }).eq('task_id', id).eq('status', 'held');
      await supabase.from('tasks').update({ status: 'disputed' }).eq('id', id);
      
      alert('⚠️ Disputa aberta! O valor está congelado. A administração entrará em contacto.');
      fetchAll();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      eletrica: '⚡ Elétrica', encanamento: '💧 Encanamento', pintura: '🎨 Pintura',
      limpeza: '🧹 Limpeza', mudancas: '📦 Mudanças', ti: '💻 TI / Computadores', outros: '🔧 Outros',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!task) return null;

  const isClient = user?.id === task.client_id;
  const acceptedProposal = proposals.find(p => p.status === 'accepted');
  const isWorker = acceptedProposal?.worker_id === user?.id;
  const isParticipant = isClient || isWorker;

  const myReviews = reviews.filter(r => r.reviewer_id === user?.id);
  const hasReviewedWorker = myReviews.some(r => r.reviewed_id === acceptedProposal?.worker_id);
  const hasSentAnyProposal = proposals.some(p => p.worker_id === user?.id);

  const clientName = clientProfile?.user_type === 'company' ? clientProfile?.company_name : clientProfile?.full_name || 'Cliente';
  const workerName = acceptedProposal?.worker?.user_type === 'company' ? (acceptedProposal?.worker?.company_name || 'Empresa') : (acceptedProposal?.worker?.full_name || 'Trabalhador');

  const getStatusInfo = () => {
    switch (task.status) {
      case 'open': return { text: 'Aberta', style: styles.statusOpen };
      case 'pending_payment': return { text: 'Aguardando Pagamento', style: styles.statusPending };
      case 'in_progress': return { text: 'Em Andamento', style: styles.statusProgress };
      case 'completed': return { text: 'Aguardando Aprovação', style: styles.statusCompleted };
      case 'disputed': return { text: '⚠️ Em Disputa', style: styles.statusDisputed };
      case 'cancelled': return { text: 'Cancelada', style: styles.statusCancelled };
      default: return { text: task.status, style: styles.statusOpen };
    }
  };
  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Tarefa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.taskHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{getCategoryLabel(task.category)}</Text>
            </View>
            <View style={[styles.statusBadge, statusInfo.style]}>
              <Text style={styles.statusText}>{statusInfo.text}</Text>
            </View>
          </View>

          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskDescription}>{task.description}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.infoText}>{task.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
            <Text style={[styles.infoText, { color: colors.success, fontWeight: '700' }]}>
              Orçamento: {formatCurrency(task.budget)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.infoText}>Publicado por: {clientName}</Text>
          </View>
        </View>

        {/* Botão Enviar Proposta */}
        {!isParticipant && task.status === 'open' && !acceptedProposal && !hasSentAnyProposal && (
          <View style={styles.section}>
            <Button title="Enviar Proposta" onPress={() => router.push({ pathname: '/send-proposal', params: { taskId: task.id } })} variant="primary" size="large" fullWidth />
          </View>
        )}

        {/* CLIENTE: Depositar em Escrow (Status: pending_payment) */}
        {isClient && task.status === 'pending_payment' && acceptedProposal && escrowStatus !== 'held' && (
          <View style={styles.section}>
            <View style={styles.escrowBox}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.escrowTitle}>Pagamento Seguro (Escrow)</Text>
                <Text style={styles.escrowText}>Deposite o valor para iniciar o trabalho. O dinheiro fica bloqueado até a conclusão.</Text>
              </View>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button
                title={`🔒 Depositar ${formatCurrency(acceptedProposal.price)} em Escrow`}
                onPress={handleDepositEscrow}
                variant="primary"
                size="large"
                fullWidth
              />
            </View>
          </View>
        )}

        {/* CLIENTE: Mensagem após depósito (Status: in_progress, Escrow: held) */}
        {isClient && task.status === 'in_progress' && escrowStatus === 'held' && (
          <View style={styles.section}>
            <View style={[styles.escrowBox, { backgroundColor: '#DCFCE7', borderColor: colors.success, borderWidth: 1 }]}>
              <Ionicons name="lock-closed" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.escrowTitle, { color: colors.success }]}>Pagamento em Escrow Ativo</Text>
                <Text style={styles.escrowText}>O valor de {formatCurrency(acceptedProposal?.price || 0)} está seguro. Aguarde o trabalhador concluir.</Text>
              </View>
            </View>
          </View>
        )}

        {/* 🗺️ TRABALHADOR: Botão Como Chegar (quando tarefa está em andamento ou pendente) */}
        {isWorker && (task.status === 'in_progress' || task.status === 'pending_payment') && task.latitude && task.longitude && (
          <View style={styles.section}>
            <View style={[styles.infoBox, { backgroundColor: '#ECFDF5', borderColor: colors.success, borderWidth: 1 }]}>
              <Ionicons name="navigate" size={24} color={colors.success} />
              <Text style={[styles.infoBoxText, { color: colors.success }]}>
                📍 Local: {task.location_name || task.location}
              </Text>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Button 
                title="🗺️ Como Chegar (Google Maps)" 
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}&travelmode=driving`)} 
                variant="primary" 
                size="large" 
                fullWidth 
              />
              <Button 
                title="🚗 Como Chegar (Waze)" 
                onPress={() => Linking.openURL(`https://www.waze.com/ul?ll=${task.latitude},${task.longitude}&navigate=yes&zoom=17`)} 
                variant="outline" 
                size="large" 
                fullWidth 
              />
            </View>
          </View>
        )}

        {/* TRABALHADOR: Status in_progress - Solicitar conclusão */}
        {isWorker && task.status === 'in_progress' && (
          <View style={styles.section}>
            <View style={styles.infoBox}>
              <Ionicons name="hammer" size={24} color={colors.primary} />
              <Text style={styles.infoBoxText}>O trabalho está em andamento. Quando terminar, solicite a conclusão.</Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button title="🛠️ Solicitar Conclusão" onPress={handleWorkerRequestCompletion} variant="primary" size="large" fullWidth />
            </View>
          </View>
        )}

        {/* TRABALHADOR: Status completed - Aguardando aprovação */}
        {isWorker && task.status === 'completed' && escrowStatus === 'held' && (
          <View style={styles.section}>
            <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1 }]}>
              <Ionicons name="time" size={24} color="#D97706" />
              <Text style={[styles.infoBoxText, { color: '#D97706' }]}>Aguardando aprovação do cliente. O pagamento será liberado após a aprovação.</Text>
            </View>
          </View>
        )}

        {/* TRABALHADOR: Status completed, Escrow released - Trabalho aprovado */}
        {isWorker && task.status === 'completed' && escrowStatus === 'released' && (
          <View style={styles.section}>
            <View style={[styles.infoBox, { backgroundColor: '#DCFCE7', borderColor: colors.success, borderWidth: 1 }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={[styles.infoBoxText, { color: colors.success }]}>Trabalho aprovado! O pagamento foi liberado para a sua carteira.</Text>
            </View>
          </View>
        )}

        {/* CLIENTE: Status completed, Escrow held - Aprovar ou disputar */}
        {isClient && task.status === 'completed' && escrowStatus === 'held' && (
          <View style={styles.section}>
            <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1 }]}>
              <Ionicons name="eye-outline" size={24} color="#D97706" />
              <Text style={[styles.infoBoxText, { color: '#D97706' }]}>O trabalhador solicitou a conclusão. Inspeccione o trabalho.</Text>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Button title="✅ Aprovar e Liberar Pagamento" onPress={handleClientApproveAndRelease} variant="primary" size="large" fullWidth />
              <Button title="⚠️ Reportar Problema (Abrir Disputa)" onPress={handleClientOpenDispute} variant="outline" size="large" fullWidth />
              <Text style={styles.disputeWarning}>
                Nota: Ao abrir disputa, o valor fica congelado. A administração analisará o caso.
              </Text>
            </View>
          </View>
        )}

        {/* Status disputed */}
        {task.status === 'disputed' && (
          <View style={styles.section}>
            <View style={[styles.infoBox, { backgroundColor: '#FEE2E2', borderColor: colors.error, borderWidth: 1 }]}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <Text style={[styles.infoBoxText, { color: colors.error }]}>Esta tarefa está em disputa. O valor está congelado. A administração entrará em contacto.</Text>
            </View>
          </View>
        )}

        {/* Lista de Propostas */}
        {isClient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Propostas Recebidas ({proposals.length})</Text>
            {proposals.length === 0 ? (
              <View style={styles.emptyProposals}>
                <Ionicons name="document-text-outline" size={48} color={colors.text.light} />
                <Text style={styles.emptyText}>Nenhuma proposta ainda</Text>
              </View>
            ) : (
              proposals.map((proposal) => {
                const wName = proposal.worker?.user_type === 'company' ? proposal.worker?.company_name : proposal.worker?.full_name;
                return (
                  <View key={proposal.id} style={styles.proposalCard}>
                    <View style={styles.proposalHeader}>
                      <View style={styles.workerInfo}>
                        <View style={styles.workerAvatar}><Ionicons name="person" size={20} color={colors.primary} /></View>
                        <View>
                          <Text style={styles.workerName}>{wName || 'Trabalhador'}</Text>
                          <View style={styles.workerMeta}>
                            <Text style={styles.workerLevel}>{proposal.worker?.level}</Text>
                            <Text style={styles.workerScore}>⭐ {proposal.worker?.trust_score}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.proposalStatus, proposal.status === 'pending' ? styles.pendingStatus : proposal.status === 'accepted' ? styles.acceptedStatus : styles.rejectedStatus]}>
                        <Text style={styles.proposalStatusText}>{proposal.status === 'pending' ? 'Pendente' : proposal.status === 'accepted' ? 'Aceita' : 'Rejeitada'}</Text>
                      </View>
                    </View>
                    <Text style={styles.proposalMessage}>"{proposal.message}"</Text>
                    <View style={styles.proposalDetails}>
                      <View style={styles.proposalDetail}><Ionicons name="cash-outline" size={16} color={colors.primary} /><Text style={styles.proposalDetailText}>{formatCurrency(proposal.price)}</Text></View>
                      <View style={styles.proposalDetail}><Ionicons name="time-outline" size={16} color={colors.primary} /><Text style={styles.proposalDetailText}>{proposal.deadline_days} dias</Text></View>
                    </View>
                    {proposal.status === 'pending' && isClient && (
                      <View style={styles.proposalActions}>
                        <View style={styles.actionButtonsRow}>
                          <Button title="Negociar" onPress={() => router.push({ pathname: '/negotiate', params: { proposalId: proposal.id } })} variant="outline" size="small" />
                          <Button title="Aceitar" onPress={async () => {
                            try {
                              await supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);
                              await supabase.from('proposals').update({ status: 'rejected' }).eq('task_id', id).neq('id', proposal.id);
                              await supabase.from('tasks').update({ status: 'pending_payment' }).eq('id', id);
                              
                              await NotificationService.createNotification(
                                proposal.worker_id,
                                'proposal_accepted',
                                'Proposta Aceite! 🎉',
                                `O cliente aceitou a sua proposta para "${task.title}". Aguarde o depósito em Escrow para iniciar.`,
                                String(id),
                                'task'
                              );

                              alert('✅ Proposta aceite! Deposite em Escrow para iniciar o trabalho.');
                              fetchAll();
                            } catch (err) {
                              alert('Erro ao aceitar proposta');
                            }
                          }} variant="primary" size="small" />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* CHAT - Apenas para participantes (Cliente e Trabalhador aceite) */}
        {isParticipant && task.status !== 'open' && acceptedProposal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Chat da Tarefa</Text>
            <ChatBox 
              taskId={task.id} 
              otherUserId={isClient ? acceptedProposal.worker_id : task.client_id}
              otherUserName={isClient ? workerName : clientName}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  section: { backgroundColor: colors.surface, padding: spacing.lg, marginTop: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  categoryBadge: { backgroundColor: colors.surfaceDark, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  categoryText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusOpen: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusProgress: { backgroundColor: '#DBEAFE' },
  statusCompleted: { backgroundColor: '#E0E7FF' },
  statusDisputed: { backgroundColor: '#FEE2E2' },
  statusCancelled: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text.primary },
  taskTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  taskDescription: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24, marginBottom: spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoText: { fontSize: fontSize.md, color: colors.text.primary },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#DBEAFE', padding: spacing.md, borderRadius: borderRadius.md },
  infoBoxText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600', flex: 1 },
  emptyProposals: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
  proposalCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  workerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  workerMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  workerLevel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  workerScore: { fontSize: fontSize.xs, color: colors.text.secondary },
  proposalStatus: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  pendingStatus: { backgroundColor: '#FEF3C7' },
  acceptedStatus: { backgroundColor: '#DCFCE7' },
  rejectedStatus: { backgroundColor: '#FEE2E2' },
  proposalStatusText: { fontSize: fontSize.xs, fontWeight: '600' },
  proposalMessage: { fontSize: fontSize.md, color: colors.text.primary, lineHeight: 22, marginBottom: spacing.md, fontStyle: 'italic' },
  proposalDetails: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  proposalDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  proposalDetailText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  proposalActions: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  actionButtonsRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  disputeWarning: { fontSize: fontSize.xs, color: colors.text.secondary, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.sm },
  escrowBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#EDE9FE', padding: spacing.md, borderRadius: borderRadius.md },
  escrowTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  escrowText: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
});