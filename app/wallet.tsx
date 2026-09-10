// app/wallet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { WalletService, PaySuiteService } from '../lib/paysuite';

// ==========================================
// 🎨 COMPONENTE MODAL ORGANIZADO E SEGURO
// ==========================================
function ActionModal({ visible, title, onClose, onSubmit, fields }: any) {
  const { colors } = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setValues({});
      setLoading(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    // 1. Validação rigorosa dos campos
    for (const field of fields) {
      if (!values[field.key] || values[field.key].trim() === '') {
        Alert.alert('Atenção', `O campo "${field.label}" é obrigatório.`);
        return;
      }
    }
    
    setLoading(true);
    try {
      // 2. Executa a operação assíncrona. 
      // Se falhar, o catch abaixo intercepta. Se tiver sucesso, o modal fecha.
      await onSubmit(values);
      onClose(); 
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado.');
    } finally {
      // 3. Garante que o estado de loading é sempre removido, mesmo em caso de erro
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Cabeçalho do Modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          {/* Corpo com Scroll (evita que o teclado esconda os campos) */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {fields.map((field: any, index: number) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>{field.label}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.text.light}
                  value={values[field.key] || ''}
                  onChangeText={(text) => setValues({ ...values, [field.key]: text })}
                  keyboardType={field.keyboardType || 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </ScrollView>

          {/* Rodapé Fixo com Botões Nativos */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} 
              onPress={onClose} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.text.primary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]} 
              onPress={handleSubmit} 
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => { fetchWalletData(); }, []);

  const fetchWalletData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
      if (wallet) {
        setBalance(wallet.balance);
        setTotalEarned(wallet.total_earned);
        setTotalSpent(wallet.total_spent);
      }
      const txs = await WalletService.getTransactions(user.id);
      setTransactions(txs || []);
    } catch (err) {
      console.error('Erro ao carregar carteira:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit': return { name: 'arrow-down' as const, color: colors.success };
      case 'debit': return { name: 'arrow-up' as const, color: colors.error };
      case 'escrow_hold': return { name: 'lock-closed' as const, color: colors.warning };
      case 'escrow_release': return { name: 'lock-open' as const, color: colors.success };
      case 'refund': return { name: 'return-up-back' as const, color: colors.primary };
      default: return { name: 'swap-horizontal' as const, color: colors.text.secondary };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Recebimento';
      case 'debit': return 'Pagamento';
      case 'escrow_hold': return 'Escrow (Bloqueado)';
      case 'escrow_release': return 'Escrow Liberado';
      case 'refund': return 'Reembolso';
      default: return type;
    }
  };

  // ✅ 1. ADICIONAR FUNDOS (Lógica Async Limpa)
  const handleAddFundsSubmit = async (values: any) => {
    if (!user?.id) throw new Error('Utilizador não autenticado.');
    
    const methodMap: any = { '1': 'M-Pesa', '2': 'e-Mola', '3': 'mKesh', '4': 'Banco' };
    const methodKey = values.method.trim();
    
    if (!methodMap[methodKey]) {
      throw new Error('Método inválido. Digite 1 (M-Pesa), 2 (e-Mola), 3 (mKesh) ou 4 (Banco).');
    }
    
    const methodName = methodMap[methodKey];
    const amount = parseFloat(values.amount.replace(',', '.'));

    if (isNaN(amount) || amount <= 0) throw new Error('Insira um valor válido maior que zero.');

    // Chama o serviço de pagamento
    const result = await PaySuiteService.initiatePayment({ 
      amount, currency: 'MZN', 
      method: methodKey === '1' ? 'mpesa' : methodKey === '2' ? 'emola' : methodKey === '3' ? 'mkesh' : 'bank_transfer', 
      phoneNumber: values.phoneOrAccount, 
      description: `Carregamento via ${methodName}`, 
      referenceId: `ADD_${Date.now()}` 
    });
    
    if (!result.success) {
      throw new Error(result.message || 'Falha ao processar o pagamento.');
    }

    // Se chegou aqui, o pagamento foi bem-sucedido
    await WalletService.creditWallet(user.id, amount, `Depósito via ${methodName}`);
    Alert.alert('Sucesso!', 'Fundos adicionados com sucesso!');
    fetchWalletData();
  };

  // ✅ 2. LEVANTAR FUNDOS (Lógica Async Limpa)
  const handleWithdrawSubmit = async (values: any) => {
    if (!user?.id) throw new Error('Utilizador não autenticado.');
    
    const amount = parseFloat(values.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) throw new Error('Insira um valor válido maior que zero.');
    if (amount > balance) throw new Error(`Saldo insuficiente. O seu saldo atual é ${formatCurrency(balance)}.`);

    const result = await PaySuiteService.initiatePayment({ 
      amount, currency: 'MZN', method: 'mpesa', phoneNumber: values.destination, 
      description: 'Levantamento de fundos', referenceId: `WTH_${Date.now()}` 
    });
    
    if (!result.success) {
      throw new Error(result.message || 'Falha ao iniciar o levantamento.');
    }

    const success = await WalletService.debitWallet(user.id, amount, `Levantamento para ${values.destination}`);
    if (!success) { 
      throw new Error('Falha ao debitar o saldo da carteira.'); 
    }
    
    Alert.alert('Sucesso!', 'Pedido de levantamento enviado com sucesso!'); 
    fetchWalletData(); 
  };

  // ✅ 3. TRANSFERIR FUNDOS (Lógica Async Limpa)
  const handleTransferSubmit = async (values: any) => {
    if (!user?.id) throw new Error('Utilizador não autenticado.');
    
    const amount = parseFloat(values.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) throw new Error('Insira um valor válido maior que zero.');
    if (amount > balance) throw new Error(`Saldo insuficiente. O seu saldo atual é ${formatCurrency(balance)}.`);

    const success = await WalletService.debitWallet(user.id, amount, `Transferência para ${values.targetId}`);
    if (!success) {
      throw new Error('Falha ao debitar o saldo. Verifique se tem fundos suficientes.');
    }

    await WalletService.creditWallet(values.targetId, amount, 'Recebimento de transferência');
    Alert.alert('Sucesso!', 'Transferência realizada com sucesso!');
    fetchWalletData();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text.secondary, marginTop: 12 }}>Carregando carteira...</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Minha Carteira</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>Saldo Disponível</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="trending-up" size={16} color="#FFFFFF" />
              <Text style={styles.balanceItemLabel}>Recebido</Text>
              <Text style={styles.balanceItemValue}>{formatCurrency(totalEarned)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Ionicons name="trending-down" size={16} color="#FFFFFF" />
              <Text style={styles.balanceItemLabel}>Gasto</Text>
              <Text style={styles.balanceItemValue}>{formatCurrency(totalSpent)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowAddModal(true)} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={22} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Adicionar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowWithdrawModal(true)} activeOpacity={0.7}>
            <Ionicons name="download" size={22} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Levantar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTransferModal(true)} activeOpacity={0.7}>
            <Ionicons name="send" size={22} color={colors.text.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Transferir</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Métodos de Pagamento</Text>
          <View style={styles.methodsRow}>
            {['M-Pesa', 'e-Mola', 'mKesh', 'Banco'].map((m, i) => (
              <View key={i} style={[styles.methodChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={styles.methodIcon}>{i === 3 ? '🏦' : '📱'}</Text>
                <Text style={[styles.methodText, { color: colors.text.primary }]}>{m}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.poweredBy, { color: colors.text.light }]}>Powered by PaySuite (Modo Sandbox)</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Histórico de Transações</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={48} color={colors.text.light} />
              <Text style={[styles.emptyTxText, { color: colors.text.secondary }]}>Nenhuma transação ainda</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const icon = getTypeIcon(tx.type);
              const isCredit = tx.type === 'credit' || tx.type === 'escrow_release' || tx.type === 'refund';
              return (
                <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.txIcon, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txDescription, { color: colors.text.primary }]}>{tx.description || getTypeLabel(tx.type)}</Text>
                    <Text style={[styles.txDate, { color: colors.text.secondary }]}>
                      {new Date(tx.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.error }]}>
                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* MODAIS ORGANIZADOS */}
      <ActionModal
        visible={showAddModal}
        title="Adicionar Fundos"
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddFundsSubmit}
        fields={[
          { key: 'method', label: 'Método (1: M-Pesa, 2: e-Mola, 3: mKesh, 4: Banco)', placeholder: 'Digite 1, 2, 3 ou 4' },
          { key: 'phoneOrAccount', label: 'Número de Telefone ou Conta', placeholder: 'Ex: 841234567' },
          { key: 'amount', label: 'Valor a Carregar (MT)', placeholder: 'Ex: 5000', keyboardType: 'numeric' }
        ]}
      />

      <ActionModal
        visible={showWithdrawModal}
        title="Levantar Fundos"
        onClose={() => setShowWithdrawModal(false)}
        onSubmit={handleWithdrawSubmit}
        fields={[
          { key: 'amount', label: 'Valor a Levantar (MT)', placeholder: 'Ex: 2000', keyboardType: 'numeric' },
          { key: 'destination', label: 'Destino (M-Pesa, e-Mola ou Conta)', placeholder: 'Ex: 841234567' }
        ]}
      />

      <ActionModal
        visible={showTransferModal}
        title="Transferir para Utilizador"
        onClose={() => setShowTransferModal(false)}
        onSubmit={handleTransferSubmit}
        fields={[
          { key: 'amount', label: 'Valor da Transferência (MT)', placeholder: 'Ex: 1000', keyboardType: 'numeric' },
          { key: 'targetId', label: 'ID do Utilizador Destinatário', placeholder: 'Cole o ID aqui' }
        ]}
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 20, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4, fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 20, letterSpacing: -1 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  balanceItem: { alignItems: 'center', flex: 1 },
  balanceItemLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  balanceItemValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  balanceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  actionButtonText: { fontSize: 14, fontWeight: '600' },
  section: { padding: 20, borderRadius: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  methodsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  methodChip: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  methodIcon: { fontSize: 20, marginBottom: 4 },
  methodText: { fontSize: 12, fontWeight: '600' },
  poweredBy: { fontSize: 12, textAlign: 'center', fontStyle: 'italic', marginTop: 8 },
  emptyTx: { alignItems: 'center', paddingVertical: 40 },
  emptyTxText: { fontSize: 15, marginTop: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txDescription: { fontSize: 15, fontWeight: '600' },
  txDate: { fontSize: 12, marginTop: 4 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  
  // ✅ ESTILOS DO MODAL MELHORADOS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 20, borderWidth: 1, overflow: 'hidden', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  closeButton: { padding: 4 },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  modalInput: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 0, borderTopWidth: 1 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});