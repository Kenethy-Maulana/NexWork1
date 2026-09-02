export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  secondary: '#10B981',
  secondaryDark: '#059669',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceDark: '#F3F4F6',
  text: { primary: '#111827', secondary: '#6B7280', light: '#9CA3AF', inverse: '#FFFFFF' },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const borderRadius = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 };
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 32 };
export const fontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' };

export const theme = { colors, spacing, borderRadius, fontSize, fontWeight };
export type Theme = typeof theme;