// lib/admin-auth.ts
import { supabase } from './supabase';

export const AdminAuthService = {
  
  async login(email: string, password: string) {
    console.log('🔑 A tentar login com:', email.trim()); 
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), // Remove espaços acidentais
      password: password.trim(), // Remove espaços acidentais
    });

    if (error) {
      console.error('❌ Erro detalhado do Supabase Auth:', error); 
      return { success: false, message: error.message || 'Credenciais inválidas' };
    }

    if (!data.user) {
      return { success: false, message: 'Utilizador não encontrado' };
    }

    // 2. Verificar se este utilizador é um Admin ativo
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, role, user_id')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminData) {
      await supabase.auth.signOut();
      return { success: false, message: 'Acesso negado: Esta conta não tem privilégios de administrador.' };
    }

    return {
      success: true,
      message: 'Login bem-sucedido',
      admin: adminData,
      user: data.user,
    };
  },

  // 3. Verificar se há um admin logado (usado no admin.tsx)
  async getCurrentAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: adminData } = await supabase
      .from('admins')
      .select('id, role, user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    return adminData ? { ...adminData, user } : null;
  },

  // 4. Logout
  async logout() {
    await supabase.auth.signOut();
  },
};