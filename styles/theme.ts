// styles/theme.ts
import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// 🌙 TEMA ESCURO (Premium Deep Navy)
// ==========================================
export const darkTheme = {
  colors: {
    primary: '#3B82F6',
    primaryDark: '#1E3A8A',
    primaryLight: '#60A5FA',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceLight: '#334155',
    text: { primary: '#F8FAFC', secondary: '#94A3B8', light: '#64748B', inverse: '#0F172A' },
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#334155',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, xxxl: 36 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
} as const;

// ==========================================
// ☀️ TEMA CLARO (Clean & Professional)
// ==========================================
export const lightTheme = {
  colors: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#3B82F6',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceLight: '#E2E8F0',
    text: { primary: '#0F172A', secondary: '#64748B', light: '#94A3B8', inverse: '#FFFFFF' },
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    border: '#E2E8F0',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, xxxl: 36 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
} as const;

// ==========================================
// 🔄 HOOK PERSONALIZADO COM BOTÃO DE ALTERNÂNCIA
// ==========================================
export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark'); // Padrão inicial: Escuro (Premium)
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('nexwork_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme);
      }
      setIsLoaded(true);
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    await AsyncStorage.setItem('nexwork_theme', newMode);
  };

  const currentTheme = themeMode === 'dark' ? darkTheme : lightTheme;

  return { 
    ...currentTheme, 
    themeMode, 
    toggleTheme, 
    isDark: themeMode === 'dark',
    isLoaded 
  };
};

// Fallback para componentes estáticos
export const theme = lightTheme;
export type Theme = typeof lightTheme;