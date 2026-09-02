import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, fontSize, fontWeight, spacing } from '../../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', size = 'medium', loading = false, disabled = false, fullWidth = false, style, textStyle }) => {
  const buttonStyles = [styles.button, styles[`${variant}Button`], styles[`${size}Button`], fullWidth && styles.fullWidth, disabled && styles.disabled, style];
  const textStyles = [styles.text, styles[`${variant}Text`], styles[`${size}Text`], disabled && styles.disabledText, textStyle];

  const renderContent = () => {
    if (loading) return <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.surface} size="small" />;
    return <Text style={textStyles}>{title}</Text>;
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={buttonStyles} activeOpacity={0.8}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.gradient, fullWidth && styles.fullWidth]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={buttonStyles} activeOpacity={0.8}>
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: { borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  gradient: { borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  fullWidth: { width: '100%' },
  primaryButton: {},
  secondaryButton: { backgroundColor: colors.secondary, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary, paddingVertical: spacing.md - 2, paddingHorizontal: spacing.lg },
  ghostButton: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  smallButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  mediumButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  largeButton: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  disabled: { opacity: 0.5 },
  text: { fontWeight: fontWeight.semibold as any, textAlign: 'center' },
  primaryText: { color: colors.surface },
  secondaryText: { color: colors.surface },
  outlineText: { color: colors.primary },
  ghostText: { color: colors.primary },
  disabledText: { color: colors.text.light },
  smallText: { fontSize: fontSize.sm },
  mediumText: { fontSize: fontSize.md },
  largeText: { fontSize: fontSize.lg },
});