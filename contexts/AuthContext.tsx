import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, userType?: 'individual' | 'company') => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      // Usamos maybeSingle() para não dar erro 406 se a linha não existir
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
      }

      if (!data) {
        console.log('Perfil não encontrado, tentando criar/atualizar...');
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
          // CORREÇÃO 1: Usar upsert em vez de insert para evitar conflitos e ser mais resiliente a RLS
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              email: userData.user.email || '',
              full_name: userData.user.user_metadata?.full_name || 'Utilizador',
              // CORREÇÃO 2: 'individual' em vez de 'normal' (que violava a constraint)
              user_type: userData.user.user_metadata?.user_type || 'individual', 
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.warn('⚠️ Não foi possível criar o perfil automaticamente (pode ser bloqueio de RLS):', upsertError.message);
            // Não bloqueamos o login. O utilizador entra e pode preencher o perfil depois.
          } else {
            // Recarrega o perfil recém-criado/atualizado
            const { data: newData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            setProfile(newData);
          }
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Exceção ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carregar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, userType: 'individual' | 'company' = 'individual') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name,
          user_type: userType 
        } 
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignora silenciosamente o erro se o usuário já estiver deslogado
      console.log("Aviso ao fazer logout (sessão já inválida):", error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Utilizador não autenticado') };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      await loadProfile(user.id);
    }

    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signUp, 
      signIn, 
      signOut,
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};