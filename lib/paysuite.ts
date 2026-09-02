// lib/paysuite.ts
import { supabase } from './supabase';

export type PaymentMethod = 'mpesa' | 'emola' | 'mkesh' | 'bank_transfer' | 'wallet_balance';

export interface PaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  phoneNumber?: string;
  description: string;
  referenceId: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
}

export const PaySuiteService = {
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      transactionId: `PS_${Date.now()}`,
      status: 'completed',
      message: `Pagamento de ${request.amount} MZN via ${request.method.toUpperCase()} processado.`,
    };
  },

  async createEscrow(request: PaymentRequest): Promise<PaymentResponse> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      transactionId: `ESC_${Date.now()}`,
      status: 'completed',
      message: `Escrow de ${request.amount} MZN criado com sucesso.`,
    };
  },

  async releaseEscrow(escrowId: string): Promise<PaymentResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      transactionId: escrowId,
      status: 'completed',
      message: 'Escrow liberado com sucesso.',
    };
  },
};

export const WalletService = {
  // CORREÇÃO DO ERRO 406: Query simplificada e robusta
  async getBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle(); // maybeSingle evita erros se não existir
    
    if (error) {
      console.error('❌ Erro ao buscar saldo:', error);
      return 0;
    }
    return data?.balance || 0;
  },

  async getTransactions(userId: string): Promise<any[]> {
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletError || !wallet) {
      console.error('❌ Erro ao buscar carteira:', walletError);
      return [];
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar transações:', error);
      return [];
    }
    return data || [];
  },

async creditWallet(userId: string, amount: number, description: string): Promise<boolean> {
  try {
    // Chama a função segura no banco de dados que ignora as restrições de RLS do cliente
    const { data, error } = await supabase.rpc('credit_user_wallet', {
      target_user_id: userId,
      amount: amount,
      desc_text: description
    });

    if (error) {
      console.error('❌ Erro ao creditar carteira via RPC:', error);
      return false;
    }
    
    console.log('✅ Carteira creditada com sucesso via RPC!');
    return data === true;
  } catch (err) {
    console.error('❌ Exceção ao creditar carteira:', err);
    return false;
  }
},

  async debitWallet(userId: string, amount: number, description: string): Promise<boolean> {
    const { data: wallet, error: findError } = await supabase
      .from('wallets')
      .select('id, balance, total_spent')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError || !wallet) return false;
    if ((wallet.balance || 0) < amount) return false; // Saldo insuficiente

    const newBalance = (wallet.balance || 0) - amount;
    const newSpent = (wallet.total_spent || 0) + amount;

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, total_spent: newSpent })
      .eq('id', wallet.id);

    if (updateError) return false;

    await supabase.from('transactions').insert({
      wallet_id: wallet.id,
      type: 'debit',
      amount,
      description,
      payment_method: 'wallet_balance',
      status: 'completed',
    });

    return true;
  },
};