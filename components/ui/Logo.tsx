import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '../../styles/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const sizes = { small: 60, medium: 100, large: 140 };
  const textSize = { small: 20, medium: 28, large: 36 };

  return (
    <View style={styles.container}>
      <View style={[styles.logoContainer, { width: sizes[size], height: sizes[size] }]}>
        <View style={[styles.outerCircle, { width: sizes[size], height: sizes[size] }]} />
        <View style={[styles.innerCircle, { width: sizes[size] * 0.7, height: sizes[size] * 0.7 }]} />
        <View style={[styles.centerCircle, { width: sizes[size] * 0.4, height: sizes[size] * 0.4 }]} />
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.logoText, { fontSize: textSize[size] }]}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Nex</Text>
            <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>Work</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  logoContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  outerCircle: { position: 'absolute', borderRadius: 9999, backgroundColor: colors.primary, opacity: 0.9 },
  innerCircle: { position: 'absolute', borderRadius: 9999, backgroundColor: colors.surface },
  centerCircle: { position: 'absolute', borderRadius: 9999, backgroundColor: colors.secondary },
  textContainer: { marginTop: 16 },
  logoText: { letterSpacing: -1, textAlign: 'center' },
});