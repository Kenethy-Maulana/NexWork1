// app/wallet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { WalletService, PaySuiteService } from '../lib/paysuite';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit': return { name: 'arrow-down' as const, color: colors.success };
      case 'debit': return { name: 'arrow-up' as const, color: colors.error };
      case 'escrow_hold': return { name: 'lock-closed' as const, color: '#F59E0B' };
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

  // =========================================================================
  // AÇÕES: ADICIONAR FUNDOS (COM MÉTODO)
  // =========================================================================
  const handleAddFunds = async () => {
    const method = window.prompt('Escolha o método:\n1. M-Pesa\n2. e-Mola\n3. mKesh\n4. Transferência Bancária\n(Digite 1, 2, 3 ou 4)');
    if (!method || !['1', '2', '3', '4'].includes(method)) return;

    const methodNames = { '1': 'M-Pesa', '2': 'e-Mola', '3': 'mKesh', '4': 'Banco' };
    const phoneOrAccount = window.prompt(`Insira o número de ${methodNames[method as keyof typeof methodNames]} ou conta:`);
    if (!phoneOrAccount) return;

    const amountStr = window.prompt(`Quanto deseja carregar via ${methodNames[method as keyof typeof methodNames]}? (Ex: 5000)`);
    if (!amountStr) return;

    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    const result = await PaySuiteService.initiatePayment({
      amount,
      currency: 'MZN',
      method: method === '1' ? 'mpesa' : method === '2' ? 'emola' : method === '3' ? 'mkesh' : 'bank_transfer',
      phoneNumber: phoneOrAccount,
      description: `Carregamento de carteira via ${methodNames[method as keyof typeof methodNames]}`,
      referenceId: `ADD_${Date.now()}`,
    });

    if (result.success) {
      await WalletService.creditWallet(user!.id, amount, `Depósito via ${methodNames[method as keyof typeof methodNames]}`);
      alert('✅ Fundos adicionados com sucesso!');
      fetchWalletData();
    } else {
      alert('Erro ao processar pagamento: ' + result.message);
    }
  };

  // =========================================================================
  // AÇÕES: LEVANTAR FUNDOS (NOVO)
  // =========================================================================
  const handleWithdraw = async () => {
    const amountStr = window.prompt('Qual o valor que deseja levantar? (Ex: 2000)');
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    if (amount > balance) {
      alert('Saldo insuficiente para este levantamento.');
      return;
    }

    const destination = window.prompt('Insira o número M-Pesa, e-Mola ou Conta Bancária de destino:');
    if (!destination) return;

    const confirmed = window.confirm(`Confirmar levantamento de ${formatCurrency(amount)} para ${destination}?`);
    if (!confirmed) return;

    // Simular processamento PaySuite
    const result = await PaySuiteService.initiatePayment({ // Reutilizando para simular payout
      amount,
      currency: 'MZN',
      method: 'mpesa', // Simplificado para demo
      phoneNumber: destination,
      description: 'Levantamento de fundos',
      referenceId: `WTH_${Date.now()}`,
    });

    if (result.success) {
      const success = await WalletService.debitWallet(user!.id, amount, `Levantamento para ${destination}`);
      if (success) {
        alert('✅ Pedido de levantamento enviado com sucesso! O dinheiro cairá em breve.');
        fetchWalletData();
      } else {
        alert('Erro ao debitar saldo.');
      }
    } else {
      alert('Erro ao processar levantamento: ' + result.message);
    }
  };

  // =========================================================================
  // AÇÕES: TRANSFERIR (P2P)
  // =========================================================================
  const handleTransfer = async () => {
    const amountStr = window.prompt('Qual o valor da transferência? (Ex: 1000)');
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    if (amount > balance) {
      alert('Saldo insuficiente para esta transferência.');
      return;
    }

    const targetId = window.prompt('Insira o ID do utilizador destinatário:');
    if (!targetId) return;

    const confirmed = window.confirm(`Confirmar transferência de ${formatCurrency(amount)} para o utilizador ${targetId}?`);
    if (!confirmed) return;

    const success = await WalletService.debitWallet(user!.id, amount, `Transferência para ${targetId}`);
    if (success) {
      await WalletService.creditWallet(targetId, amount, 'Recebimento de transferência');
      alert('✅ Transferência realizada com sucesso!');
      fetchWalletData();
    } else {
      alert('Erro ao realizar transferência.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><Text>Carregando carteira...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Carteira</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Disponível</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
              <Text style={styles.balanceItemLabel}>Recebido</Text>
              <Text style={[styles.balanceItemValue, { color: colors.success }]}>{formatCurrency(totalEarned)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Ionicons name="trending-down" size={16} color={colors.error} />
              <Text style={styles.balanceItemLabel}>Gasto</Text>
              <Text style={[styles.balanceItemValue, { color: colors.error }]}>{formatCurrency(totalSpent)}</Text>
            </View>
          </View>
        </View>

        {/* Botões de Ação ATUALIZADOS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddFunds}>
            <Ionicons name="add-circle-outline" size={24} color={colors.success} />
            <Text style={styles.actionButtonText}>Adicionar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
            <Ionicons name="download-outline" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>Levantar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleTransfer}>
            <Ionicons name="send-outline" size={24} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>Transferir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métodos de Pagamento</Text>
          <View style={styles.methodsRow}>
            <View style={styles.methodChip}><Text style={styles.methodIcon}>📱</Text><Text style={styles.methodText}>M-Pesa</Text></View>
            <View style={styles.methodChip}><Text style={styles.methodIcon}>📱</Text><Text style={styles.methodText}>e-Mola</Text></View>
            <View style={styles.methodChip}><Text style={styles.methodIcon}>📱</Text><Text style={styles.methodText}>mKesh</Text></View>
            <View style={styles.methodChip}><Text style={styles.methodIcon}>🏦</Text><Text style={styles.methodText}>Banco</Text></View>
          </View>
          <Text style={styles.poweredBy}>Powered by PaySuite (Modo Sandbox)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Transações</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={48} color={colors.text.light} />
              <Text style={styles.emptyTxText}>Nenhuma transação ainda</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const icon = getTypeIcon(tx.type);
              const isCredit = tx.type === 'credit' || tx.type === 'escrow_release' || tx.type === 'refund';
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDescription}>{tx.description || getTypeLabel(tx.type)}</Text>
                    <Text style={styles.txDate}>
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
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  balanceCard: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.lg, alignItems: 'center' },
  balanceLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: colors.surface, marginBottom: spacing.lg },
  balanceRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  balanceItem: { alignItems: 'center', flex: 1 },
  balanceItemLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  balanceItemValue: { fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.xs },
  balanceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  actionButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.md },
  methodsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  methodChip: { flex: 1, alignItems: 'center', padding: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  methodIcon: { fontSize: 20 },
  methodText: { fontSize: fontSize.xs, color: colors.text.primary, fontWeight: '600', marginTop: spacing.xs },
  poweredBy: { fontSize: fontSize.xs, color: colors.text.light, textAlign: 'center', fontStyle: 'italic' },
  emptyTx: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTxText: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.md },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txDescription: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary },
  txDate: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  txAmount: { fontSize: fontSize.md, fontWeight: '700' },
});