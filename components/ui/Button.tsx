// components/ui/Button.tsx
import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  View,
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { useTheme } from '../../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
}) => {
  // Agora o botão reage automaticamente ao tema Claro/Escuro
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  // Lógica dinâmica para o estilo do botão
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled || loading ? 0.7 : 1,
    };

    if (fullWidth) baseStyle.width = '100%';

    // Tamanhos
    if (size === 'small') {
      baseStyle.paddingVertical = spacing.sm;
      baseStyle.paddingHorizontal = spacing.md;
    } else if (size === 'large') {
      baseStyle.paddingVertical = spacing.lg;
      baseStyle.paddingHorizontal = spacing.xl;
    } else {
      baseStyle.paddingVertical = spacing.md;
      baseStyle.paddingHorizontal = spacing.lg;
    }

    // Variantes de Cor
    if (variant === 'primary') {
      baseStyle.backgroundColor = colors.primary;
      baseStyle.shadowColor = colors.primary;
      baseStyle.shadowOffset = { width: 0, height: 8 };
      baseStyle.shadowOpacity = 0.3;
      baseStyle.shadowRadius = 16;
      baseStyle.elevation = 8;
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = colors.surfaceLight;
    } else if (variant === 'outline') {
      baseStyle.backgroundColor = 'transparent';
      baseStyle.borderWidth = 1.5;
      baseStyle.borderColor = colors.primary;
    } else if (variant === 'ghost') {
      baseStyle.backgroundColor = 'transparent';
    }

    return baseStyle;
  };

  // Lógica dinâmica para o estilo do texto
  const getTextStyle = (): TextStyle => {
    const baseText: TextStyle = {
      fontWeight: fontWeight.semibold as any,
      textAlign: 'center',
    };

    if (size === 'small') baseText.fontSize = fontSize.sm;
    else if (size === 'large') baseText.fontSize = fontSize.lg;
    else baseText.fontSize = fontSize.md;

    if (variant === 'primary') baseText.color = colors.text.inverse;
    else if (variant === 'outline' || variant === 'ghost') baseText.color = colors.primary;
    else baseText.color = colors.text.primary;

    return baseText;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.text.inverse : colors.primary} />
      ) : (
        <>
          {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};