// lib/admin.ts
import { supabase } from './supabase';

export interface PlatformMetrics {
  total_users: number;
  total_individuals: number;
  total_companies: number;
  total_tasks: number;
  open_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  disputed_tasks: number;
  total_escrow_volume: number;
  released_escrow: number;
  pending_disputes: number;
  total_reviews: number;
  avg_rating: number;
  banned_users: number;
}

export interface AdvancedAnalytics {
  top_categories: any[];
  top_locations: any[];
  top_workers: any[];
  monthly_revenue: any[];
  financial_summary: any;
  avg_completion_days?: number;
  completion_rate?: number;
  avg_client_rating?: number;
  
}

export const AdminService = {
  async getMetrics(): Promise<PlatformMetrics | null> {
    const { data, error } = await supabase.rpc('get_platform_metrics');
    return error ? null : (data as PlatformMetrics);
  },

  async getAdvancedAnalytics(): Promise<AdvancedAnalytics | null> {
    const { data, error } = await supabase.rpc('get_advanced_analytics');
    return error ? null : (data as AdvancedAnalytics);
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, company_name, user_type, email, trust_score, level, is_banned, ban_reason, created_at')
      .order('created_at', { ascending: false });
    return error ? [] : (data || []);
  },

  // CORREÇÃO CRÍTICA: Usar a sintaxe explícita da chave estrangeira 'admins_user_id_fkey'
  async getAllAdmins() {
    const { data, error } = await supabase
      .from('admins')
      .select(`
        id,
        user_id,
        admin_email,
        role,
        is_active,
        created_at,
        profiles!admins_user_id_fkey (full_name, company_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar admins:', error);
      return [];
    }
    
    return (data || []).map((a: any) => ({
      id: a.id,
      user_id: a.user_id,
      admin_email: a.admin_email,
      role: a.role,
      is_active: a.is_active,
      created_at: a.created_at,
      profile_name: a.profiles ? (a.profiles.full_name || a.profiles.company_name || 'Sem nome') : 'Sem nome'
    }));
  },

  async getDisputes() {
    const { data, error } = await supabase
      .from('escrow_payments')
      .select(`
        id,
        amount,
        status,
        created_at,
        task_id,
        client_id,
        worker_id,
        tasks (title, category, location),
        client:profiles!client_id (full_name, company_name),
        worker:profiles!worker_id (full_name, company_name)
      `)
      .eq('status', 'disputed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar disputas:', error);
      return [];
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      amount: d.amount,
      status: d.status,
      task_title: d.tasks?.title || 'Tarefa desconhecida',
      task_category: d.tasks?.category || 'N/A',
      task_location: d.tasks?.location || 'N/A',
      client_name: d.client ? (d.client.full_name || d.client.company_name || 'Cliente') : 'Cliente',
      worker_name: d.worker ? (d.worker.full_name || d.worker.company_name || 'Trabalhador') : 'Trabalhador'
    }));
  },

  async resolveDispute(userId: string, escrowId: string, resolution: 'release_to_worker' | 'refund_to_client' | 'split', notes: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('resolve_dispute', {
      p_user_id: userId,
      p_escrow_id: escrowId,
      p_resolution: resolution,
      p_notes: notes,
    });
    
    if (error) {
      console.error('Erro ao resolver disputa:', error);
      return false;
    }
    return data?.success === true;
  },

    async banUser(adminUserId: string, targetUserId: string, reason: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('ban_user_by_admin', {
      p_admin_user_id: adminUserId,
      p_target_user_id: targetUserId,
      p_reason: reason
    });
    
    if (error) {
      console.error('Erro de banco de dados ao banir:', error);
      return false;
    }
    
    if (!data?.success) {
      console.error('Falha lógica ao banir:', data?.message);
      return false;
    }
    
    return true;
  },

  async unbanUser(adminUserId: string, targetUserId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('unban_user_by_admin', {
      p_admin_user_id: adminUserId,
      p_target_user_id: targetUserId
    });
    
    if (error) {
      console.error('Erro de banco de dados ao desbanir:', error);
      return false;
    }
    
    if (!data?.success) {
      console.error('Falha lógica ao desbanir:', data?.message);
      return false;
    }
    
    return true;
  },

  async getAdminLogs() {
    const { data, error } = await supabase.rpc('get_recent_admin_logs', { limit_count: 100 });
    return error ? [] : (data as any[] || []);
  },

  async createAdmin(creatorUserId: string, targetUserId: string, email: string, password: string, role: string) {
    const { data, error } = await supabase.rpc('create_admin_by_super', {
      p_creator_user_id: creatorUserId,
      p_target_user_id: targetUserId,
      p_admin_email: email,
      p_password: password,
      p_role: role,
    });
    return { data, error };
  },

  async toggleAdminStatus(adminId: string, active: boolean) {
    const { data, error } = await supabase.rpc('toggle_admin_status', {
      p_admin_id: adminId,
      p_active: active,
    });
    return { data, error };
  },

  exportToCSV(data: any[], filename: string) {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
};