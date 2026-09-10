// app/wallet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { WalletService, PaySuiteService } from '../lib/paysuite';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      setTransactions(txs);
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

  const handleAddFunds = async () => {
    const method = window.prompt('Escolha o método:\n1. M-Pesa\n2. e-Mola\n3. mKesh\n4. Transferência Bancária\n(Digite 1, 2, 3 ou 4)');
    if (!method || !['1', '2', '3', '4'].includes(method)) return;
    const methodNames: any = { '1': 'M-Pesa', '2': 'e-Mola', '3': 'mKesh', '4': 'Banco' };
    const phoneOrAccount = window.prompt(`Insira o número de ${methodNames[method]} ou conta:`);
    if (!phoneOrAccount) return;
    const amountStr = window.prompt(`Quanto deseja carregar via ${methodNames[method]}? (Ex: 5000)`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { Alert.alert('Erro', 'Insira um valor válido.'); return; }

    const result = await PaySuiteService.initiatePayment({ amount, currency: 'MZN', method: method === '1' ? 'mpesa' : method === '2' ? 'emola' : method === '3' ? 'mkesh' : 'bank_transfer', phoneNumber: phoneOrAccount, description: `Carregamento via ${methodNames[method]}`, referenceId: `ADD_${Date.now()}` });
    if (result.success) {
      await WalletService.creditWallet(user!.id, amount, `Depósito via ${methodNames[method]}`);
      Alert.alert('Sucesso!', 'Fundos adicionados com sucesso!');
      fetchWalletData();
    } else {
      Alert.alert('Erro', result.message);
    }
  };

  const handleWithdraw = async () => {
    const amountStr = window.prompt('Qual o valor que deseja levantar? (Ex: 2000)');
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { Alert.alert('Erro', 'Insira um valor válido.'); return; }
    if (amount > balance) { Alert.alert('Erro', 'Saldo insuficiente.'); return; }
    const destination = window.prompt('Insira o número M-Pesa, e-Mola ou Conta Bancária de destino:');
    if (!destination) return;
    if (!window.confirm(`Confirmar levantamento de ${formatCurrency(amount)} para ${destination}?`)) return;

    const result = await PaySuiteService.initiatePayment({ amount, currency: 'MZN', method: 'mpesa', phoneNumber: destination, description: 'Levantamento de fundos', referenceId: `WTH_${Date.now()}` });
    if (result.success) {
      const success = await WalletService.debitWallet(user!.id, amount, `Levantamento para ${destination}`);
      if (success) { Alert.alert('Sucesso!', 'Pedido de levantamento enviado!'); fetchWalletData(); }
      else { Alert.alert('Erro', 'Falha ao debitar saldo.'); }
    } else {
      Alert.alert('Erro', result.message);
    }
  };

  const handleTransfer = async () => {
    const amountStr = window.prompt('Qual o valor da transferência? (Ex: 1000)');
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { Alert.alert('Erro', 'Insira um valor válido.'); return; }
    if (amount > balance) { Alert.alert('Erro', 'Saldo insuficiente.'); return; }
    const targetId = window.prompt('Insira o ID do utilizador destinatário:');
    if (!targetId) return;
    if (!window.confirm(`Confirmar transferência de ${formatCurrency(amount)} para o utilizador ${targetId}?`)) return;

    const success = await WalletService.debitWallet(user!.id, amount, `Transferência para ${targetId}`);
    if (success) {
      await WalletService.creditWallet(targetId, amount, 'Recebimento de transferência');
      Alert.alert('Sucesso!', 'Transferência realizada!');
      fetchWalletData();
    } else {
      Alert.alert('Erro', 'Falha na transferência.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}><Text style={{ color: colors.text.secondary }}>Carregando carteira...</Text></View>
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
        {/* Cartão de Saldo Premium */}
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

        {/* Botões de Ação */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddFunds} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={22} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Adicionar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleWithdraw} activeOpacity={0.7}>
            <Ionicons name="download" size={22} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Levantar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleTransfer} activeOpacity={0.7}>
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
});