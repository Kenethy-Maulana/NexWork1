// components/ui/Input.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...rest
}) => {
  // 1. Usar o hook do tema para obter as variáveis dinâmicas
  const { colors, spacing, fontSize, borderRadius, fontWeight } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      {label && (
        <Text style={[styles.label, { color: colors.text.secondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any, marginBottom: spacing.xs }]}>
          {label}
        </Text>
      )}
      
      <View 
        style={[
          styles.inputWrapper, 
          { 
            backgroundColor: colors.surface, 
            borderColor: error ? colors.error : (isFocused ? colors.primary : colors.border),
            borderRadius: borderRadius.md,
            borderWidth: 1.5,
          }
        ]}
      >
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? colors.primary : colors.text.light} 
            style={styles.leftIcon} 
          />
        )}
        
        <TextInput
          style={[
            styles.input, 
            { 
              color: colors.text.primary, 
              fontSize: fontSize.md,
              paddingLeft: icon ? 0 : spacing.md,
              paddingRight: rightIcon ? 0 : spacing.md,
            }, 
            style
          ]}
          placeholderTextColor={colors.text.light}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        
        {rightIcon && (
          <TouchableOpacity 
            onPress={onRightIconPress} 
            style={styles.rightIconContainer}
            activeOpacity={0.7}
          >
            <Ionicons name={rightIcon} size={20} color={colors.text.light} />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

// Estilos estáticos apenas para propriedades que NÃO mudam com o tema
const styles = StyleSheet.create({
  container: {},
  label: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
  },
  rightIconContainer: {
    padding: 16,
  },
  errorText: {},
});