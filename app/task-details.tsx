// app/task-details.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { SuccessModal } from '../components/ui/SuccessModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Task, Proposal } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';
import ChatBox from '../components/ChatBox';

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, fontSize, spacing, borderRadius } = useTheme();
  
  const [task, setTask] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [negotiatePrice, setNegotiatePrice] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

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

  const showSuccessModal = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
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

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
    return labels[freq] || freq;
  };

  const handleAcceptProposal = async (proposal: Proposal) => {
    const confirmed = window.confirm(`Aceitar proposta de ${formatCurrency(proposal.price)}? As outras serão rejeitadas.`);
    if (!confirmed) return;

    try {
      await supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);
      await supabase.from('proposals').update({ status: 'rejected' }).eq('task_id', id).neq('id', proposal.id);
      await supabase.from('tasks').update({ status: 'pending_payment' }).eq('id', id);
      
      await NotificationService.createNotification(
        proposal.worker_id,
        'proposal_accepted',
        'Proposta Aceite! 🎉',
        `O cliente aceitou a sua proposta para "${task?.title}". Aguarde o depósito em Escrow para iniciar.`,
        String(id),
        'task'
      );

      setTask(prev => prev ? { ...prev, status: 'pending_payment' } : null);
      setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status: 'accepted' } : { ...p, status: 'rejected' }));
      
      showSuccessModal('✅ Proposta aceite! Deposite em Escrow para iniciar o trabalho.');
    } catch (err) {
      alert('Erro ao aceitar proposta');
    }
  };

  const handleRejectProposal = async (proposalId: string, workerId: string) => {
    try {
      await supabase.from('proposals').update({ status: 'rejected' }).eq('id', proposalId);
      await NotificationService.createNotification(
        workerId,
        'proposal_rejected',
        'Proposta Não Selecionada',
        `Infelizmente, a sua proposta para "${task?.title}" não foi selecionada desta vez.`,
        String(id),
        'task'
      );
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      showSuccessModal('Proposta rejeitada com sucesso.');
    } catch (err) {
      alert('Erro ao rejeitar proposta');
    }
  };

  const handleNegotiate = async () => {
    if (!negotiatePrice || !selectedProposalId) return;
    try {
      const newPrice = parseFloat(negotiatePrice.replace(',', '.'));
      const proposal = proposals.find(p => p.id === selectedProposalId);
      
      await supabase.from('proposals').update({ price: newPrice }).eq('id', selectedProposalId);
      await supabase.from('tasks').update({ budget: newPrice }).eq('id', id);
      
      await NotificationService.createNotification(
        proposal!.worker_id,
        'new_message',
        'Nova Contraproposta Recebida 💰',
        `O cliente propôs o valor de ${formatCurrency(newPrice)} para a tarefa.`,
        String(id),
        'task'
      );

      setShowNegotiateModal(false);
      setNegotiatePrice('');
      setTask(prev => prev ? { ...prev, budget: newPrice } : null);
      setProposals(prev => prev.map(p => p.id === selectedProposalId ? { ...p, price: newPrice } : p));
      
      showSuccessModal('Contraproposta enviada! O valor da tarefa foi atualizado.');
    } catch (err) {
      alert('Erro ao enviar contraproposta');
    }
  };

  const handleDepositEscrow = async () => {
    const accepted = proposals.find(p => p.status === 'accepted');
    if (!accepted || !task) return;

    const confirmed = window.confirm(`Depositar ${formatCurrency(accepted.price)} em Escrow?\n\nO dinheiro será bloqueado e o trabalho começará.`);
    if (!confirmed) return;
    
    try {
      const { PaySuiteService, WalletService } = await import('../lib/paysuite');
      
      const currentBalance = await WalletService.getBalance(user!.id);
      if (currentBalance < accepted.price) {
        alert(`Saldo insuficiente. Você tem ${formatCurrency(currentBalance)}. Adicione fundos primeiro.`);
        return;
      }
      
      const debitSuccess = await WalletService.debitWallet(user!.id, accepted.price, `Bloqueio em Escrow: ${task.title}`);
      if (!debitSuccess) {
        alert('Erro ao debitar saldo.');
        return;
      }
      
      const result = await PaySuiteService.createEscrow({
        amount: accepted.price,
        currency: 'MZN',
        method: 'wallet_balance',
        description: `Escrow: ${task.title}`,
        referenceId: String(id),
      });
      
      if (result.success) {
        await supabase.from('escrow_payments').insert({
          task_id: id,
          client_id: user!.id,
          worker_id: accepted.worker_id,
          amount: accepted.price,
          status: 'held',
          payment_method: 'wallet_balance',
          paysuite_transaction_id: result.transactionId,
        });
        
        await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', id);
        
        await NotificationService.createNotification(
          accepted.worker_id,
          'escrow_created',
          'Pagamento em Escrow Criado! 🔒',
          `O cliente depositou o valor para "${task.title}". O trabalho pode começar!`,
          String(id),
          'task'
        );
        
        setEscrowStatus('held');
        setTask(prev => prev ? { ...prev, status: 'in_progress' } : null);
        showSuccessModal('✅ Pagamento em Escrow criado! O trabalho pode começar.');
      }
    } catch (err: any) {
      console.error('Erro no Escrow:', err);
      alert('Erro: ' + err.message);
    }
  };

  const handleWorkerRequestCompletion = async () => {
    if (!task) return;

    const confirmed = window.confirm('Solicitar Conclusão?\n\nO cliente será notificado para inspecionar o trabalho.');
    if (!confirmed) return;

    try {
      await supabase.from('tasks').update({ status: 'completed' }).eq('id', id);
      
      await NotificationService.createNotification(
        task.client_id,
        'task_completed',
        'Trabalho Concluído! ✅',
        `O trabalhador solicitou a conclusão de "${task.title}". Por favor, inspecione e aprove o pagamento.`,
        String(id),
        'task'
      );

      setTask(prev => prev ? { ...prev, status: 'completed' } : null);
      showSuccessModal('✅ Solicitação enviada! Aguarde a aprovação do cliente.');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleClientApproveAndRelease = async () => {
    const accepted = proposals.find(p => p.status === 'accepted');
    if (!task || !accepted) return;

    const confirmed = window.confirm(
      `Aprovar Trabalho e Liberar Pagamento?\n\n` +
      `Valor do Escrow: ${formatCurrency(accepted.price)}\n` +
      `Comissão NexWork (10%): ${formatCurrency(accepted.price * 0.10)}\n` +
      `Trabalhador receberá: ${formatCurrency(accepted.price * 0.90)}\n\n` +
      `O valor líquido será transferido para a carteira do trabalhador.`
    );
    if (!confirmed) return;

    try {
      const { data, error } = await supabase.rpc('process_escrow_release', {
        p_escrow_id: escrowStatus === 'held' ? (await supabase.from('escrow_payments').select('id').eq('task_id', id).eq('status', 'held').single()).data?.id : null,
        p_commission_percent: 10
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

      await NotificationService.createNotification(
        accepted.worker_id,
        'escrow_released',
        'Pagamento Liberado! 💰',
        `O cliente aprovou o trabalho. Valor creditado: ${formatCurrency(data.worker_net_amount)} (após comissão de 10%).`,
        String(id),
        'task'
      );

      setTask(prev => prev ? { ...prev, status: 'completed' } : null);
      
      const wName = accepted.worker?.user_type === 'company' 
        ? (accepted.worker?.company_name || 'Empresa') 
        : (accepted.worker?.full_name || 'Trabalhador');
        
      showSuccessModal(`✅ Pagamento liberado!\nComissão: ${formatCurrency(data.commission_amount)}\nTrabalhador recebeu: ${formatCurrency(data.worker_net_amount)}`);
      
      setTimeout(() => {
        router.push({ pathname: '/review', params: { taskId: id, reviewedId: accepted.worker_id, reviewedName: wName } });
      }, 1500);
      
    } catch (err: any) {
      console.error('Erro ao liberar pagamento:', err);
      alert('Erro: ' + err.message);
    }
  };

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
      
      setTask(prev => prev ? { ...prev, status: 'disputed' } : null);
      showSuccessModal('⚠️ Disputa aberta! O valor está congelado. A administração entrará em contacto.');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!task) return null;

  const isClient = user?.id === task.client_id;
  const acceptedProposal = proposals.find(p => p.status === 'accepted');
  const isWorker = acceptedProposal?.worker_id === user?.id;
  const isParticipant = isClient || isWorker;

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Detalhes da Tarefa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {task.is_recurring && (
          <View style={[styles.section, { backgroundColor: colors.primary + '10', borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="repeat" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.categoryText, { color: colors.primary, fontWeight: '700' }]}>
                  Tarefa Recorrente ({getFrequencyLabel(task.recurrence_interval || 'weekly')})
                </Text>
                {task.end_date && (
                  <Text style={[styles.infoText, { fontSize: fontSize.sm, color: colors.text.secondary }]}>
                    Válido até: {new Date(task.end_date).toLocaleDateString('pt-MZ')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.taskHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>{getCategoryLabel(task.category)}</Text>
            </View>
            <View style={[styles.statusBadge, statusInfo.style]}>
              <Text style={[styles.statusText, { color: colors.text.primary }]}>{statusInfo.text}</Text>
            </View>
          </View>

          <Text style={[styles.taskTitle, { color: colors.text.primary }]}>{task.title}</Text>
          <Text style={[styles.taskDescription, { color: colors.text.secondary }]}>{task.description}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.primary }]}>{task.location_name || task.location || 'Localização não especificada'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
            <Text style={[styles.infoText, { color: colors.success, fontWeight: '700' }]}>
              Orçamento: {formatCurrency(task.budget)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={colors.text.secondary} />
            <Text style={[styles.infoText, { color: colors.text.primary }]}>Publicado por: {clientName}</Text>
          </View>
        </View>

        {!isParticipant && task.status === 'open' && !acceptedProposal && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Button title="Enviar Proposta" onPress={() => router.push({ pathname: '/send-proposal', params: { taskId: task.id } })} variant="primary" size="large" fullWidth />
          </View>
        )}

        {isClient && task.status === 'pending_payment' && acceptedProposal && escrowStatus !== 'held' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.escrowBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.escrowTitle, { color: colors.primary }]}>Pagamento Seguro (Escrow)</Text>
                <Text style={[styles.escrowText, { color: colors.text.secondary }]}>Deposite o valor para iniciar o trabalho. O dinheiro fica bloqueado até a conclusão.</Text>
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

        {isClient && task.status === 'in_progress' && escrowStatus === 'held' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.escrowBox, { backgroundColor: colors.success + '15', borderColor: colors.success, borderWidth: 1 }]}>
              <Ionicons name="lock-closed" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.escrowTitle, { color: colors.success }]}>Pagamento em Escrow Ativo</Text>
                <Text style={[styles.escrowText, { color: colors.text.secondary }]}>O valor de {formatCurrency(acceptedProposal?.price || 0)} está seguro. Aguarde o trabalhador concluir.</Text>
              </View>
            </View>
          </View>
        )}

        {isWorker && (task.status === 'in_progress' || task.status === 'pending_payment') && task.latitude && task.longitude && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoBox, { backgroundColor: colors.success + '15', borderColor: colors.success, borderWidth: 1 }]}>
              <Ionicons name="navigate" size={24} color={colors.success} />
              <Text style={[styles.infoBoxText, { color: colors.success }]}>
                📍 Local: {task.location_name || task.location || 'Localização não especificada'}
              </Text>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Button 
                title="🗺️ Como Chegar (Google Maps)" 
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${task.latitude || 0},${task.longitude || 0}&travelmode=driving`)} 
                variant="primary" 
                size="large" 
                fullWidth 
              />
              <Button 
                title="🚗 Como Chegar (Waze)" 
                onPress={() => Linking.openURL(`https://www.waze.com/ul?ll=${task.latitude || 0},${task.longitude || 0}&navigate=yes&zoom=17`)} 
                variant="outline" 
                size="large" 
                fullWidth 
              />
            </View>
          </View>
        )}

        {isWorker && task.status === 'in_progress' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="hammer" size={24} color={colors.primary} />
              <Text style={[styles.infoBoxText, { color: colors.primary }]}>O trabalho está em andamento. Quando terminar, solicite a conclusão.</Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button title="🛠️ Solicitar Conclusão" onPress={handleWorkerRequestCompletion} variant="primary" size="large" fullWidth />
            </View>
          </View>
        )}

        {isWorker && task.status === 'completed' && escrowStatus === 'held' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning, borderWidth: 1 }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
              <Text style={[styles.infoBoxText, { color: colors.warning }]}>Aguardando aprovação do cliente. O pagamento será liberado após a aprovação.</Text>
            </View>
          </View>
        )}

        {isClient && task.status === 'completed' && escrowStatus === 'held' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning, borderWidth: 1 }]}>
              <Ionicons name="eye-outline" size={24} color={colors.warning} />
              <Text style={[styles.infoBoxText, { color: colors.warning }]}>O trabalhador solicitou a conclusão. Inspeccione o trabalho.</Text>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Button title="✅ Aprovar e Liberar Pagamento" onPress={handleClientApproveAndRelease} variant="primary" size="large" fullWidth />
              <Button title="⚠️ Reportar Problema (Abrir Disputa)" onPress={handleClientOpenDispute} variant="outline" size="large" fullWidth />
              <Text style={[styles.disputeWarning, { color: colors.text.secondary }]}>
                Nota: Ao abrir disputa, o valor fica congelado. A administração analisará o caso.
              </Text>
            </View>
          </View>
        )}

        {task.status === 'disputed' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoBox, { backgroundColor: colors.error + '15', borderColor: colors.error, borderWidth: 1 }]}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <Text style={[styles.infoBoxText, { color: colors.error }]}>Esta tarefa está em disputa. O valor está congelado. A administração entrará em contacto.</Text>
            </View>
          </View>
        )}

        {isClient && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Propostas Recebidas ({proposals.length})</Text>
            {proposals.length === 0 ? (
              <View style={styles.emptyProposals}>
                <Ionicons name="document-text-outline" size={48} color={colors.text.light} />
                <Text style={[styles.emptyText, { color: colors.text.primary }]}>Nenhuma proposta ainda</Text>
              </View>
            ) : (
              proposals.map((proposal) => {
                const wName = proposal.worker?.user_type === 'company' ? proposal.worker?.company_name : proposal.worker?.full_name;
                return (
                  <View key={proposal.id} style={[styles.proposalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.proposalHeader}>
                      <View style={styles.workerInfo}>
                        <View style={[styles.workerAvatar, { backgroundColor: colors.surfaceLight }]}>
                          <Ionicons name="person" size={20} color={colors.primary} />
                        </View>
                        <View>
                          <Text style={[styles.workerName, { color: colors.text.primary }]}>{wName || 'Trabalhador'}</Text>
                          <View style={styles.workerMeta}>
                            <Text style={[styles.workerLevel, { color: colors.primary }]}>{proposal.worker?.level}</Text>
                            <Text style={[styles.workerScore, { color: colors.text.secondary }]}>⭐ {proposal.worker?.trust_score}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.proposalStatus, proposal.status === 'pending' ? styles.pendingStatus : proposal.status === 'accepted' ? styles.acceptedStatus : styles.rejectedStatus]}>
                        <Text style={[styles.proposalStatusText, { color: colors.text.primary }]}>{proposal.status === 'pending' ? 'Pendente' : proposal.status === 'accepted' ? 'Aceita' : 'Rejeitada'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.proposalMessage, { color: colors.text.primary }]}>"{proposal.message}"</Text>
                    <View style={styles.proposalDetails}>
                      <View style={styles.proposalDetail}>
                        <Ionicons name="cash-outline" size={16} color={colors.primary} />
                        <Text style={[styles.proposalDetailText, { color: colors.text.primary }]}>{formatCurrency(proposal.price)}</Text>
                      </View>
                      <View style={styles.proposalDetail}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={[styles.proposalDetailText, { color: colors.text.primary }]}>{proposal.deadline_days} dias</Text>
                      </View>
                    </View>
                    {proposal.status === 'pending' && isClient && (
                      <View style={[styles.proposalActions, { borderTopColor: colors.border }]}>
                        <View style={styles.actionButtonsRow}>
                          <Button title="💬 Negociar" onPress={() => { setSelectedProposalId(proposal.id); setNegotiatePrice(proposal.price.toString()); setShowNegotiateModal(true); }} variant="outline" size="small" />
                          <Button title="✅ Aceitar" onPress={() => handleAcceptProposal(proposal)} variant="primary" size="small" />
                          <Button title="❌ Rejeitar" onPress={() => handleRejectProposal(proposal.id, proposal.worker_id)} variant="ghost" size="small" />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {isParticipant && task.status !== 'open' && acceptedProposal && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>💬 Chat da Tarefa</Text>
            <ChatBox 
              taskId={task.id} 
              otherUserId={isClient ? acceptedProposal.worker_id : task.client_id}
              otherUserName={isClient ? workerName : clientName}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SuccessModal 
        visible={showSuccess} 
        title="Ação Concluída! 🎉" 
        message={successMessage} 
        onClose={() => {
          setShowSuccess(false);
          if (task?.status === 'completed' || task?.status === 'disputed') {
            router.replace('/(tabs)');
          } else {
            fetchAll();
          }
        }} 
      />

      <Modal visible={showNegotiateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Negociar Valor</Text>
            <Text style={[styles.modalMessage, { color: colors.text.secondary }]}>Propõe um novo valor. O trabalhador será notificado.</Text>
            
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ color: colors.text.secondary, fontSize: fontSize.md }}>MT </Text>
              <TextInput
                style={[styles.textInput, { color: colors.text.primary }]}
                value={negotiatePrice}
                onChangeText={setNegotiatePrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.text.light}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => { setShowNegotiateModal(false); setNegotiatePrice(''); }} variant="ghost" size="medium" />
              <Button title="Enviar Contraproposta" onPress={handleNegotiate} variant="primary" size="medium" />
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 40 },
  section: { padding: 20, marginTop: 12, marginHorizontal: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusOpen: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusProgress: { backgroundColor: '#DBEAFE' },
  statusCompleted: { backgroundColor: '#E0E7FF' },
  statusDisputed: { backgroundColor: '#FEE2E2' },
  statusCancelled: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  taskTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12, lineHeight: 28 },
  taskDescription: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoText: { fontSize: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  infoBoxText: { fontSize: 15, fontWeight: '600', flex: 1 },
  emptyProposals: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  proposalCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  workerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  workerName: { fontSize: 15, fontWeight: '600' },
  workerMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  workerLevel: { fontSize: 12, fontWeight: '600' },
  workerScore: { fontSize: 12 },
  proposalStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingStatus: { backgroundColor: '#FEF3C7' },
  acceptedStatus: { backgroundColor: '#DCFCE7' },
  rejectedStatus: { backgroundColor: '#FEE2E2' },
  proposalStatusText: { fontSize: 12, fontWeight: '600' },
  proposalMessage: { fontSize: 14, lineHeight: 20, marginBottom: 12, fontStyle: 'italic' },
  proposalDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  proposalDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proposalDetailText: { fontSize: 14, fontWeight: '600' },
  proposalActions: { marginTop: 12, borderTopWidth: 1, paddingTop: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  disputeWarning: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  escrowBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  escrowTitle: { fontSize: 15, fontWeight: '700' },
  escrowText: { fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  textInput: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
});