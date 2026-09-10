// components/ui/Logo.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../styles/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const { colors } = useTheme();
  
  // Fatores de escala para manter as proporções EXATAS da Splash Screen
  const scale = size === 'small' ? 0.5 : size === 'medium' ? 0.8 : 1.2;
  
  const containerSize = 160 * scale;
  const innerSize = 120 * scale;
  const hexSize = 120 * scale;
  
  return (
    <View style={styles.container}>
      <View style={[styles.logoContainer, { width: containerSize, height: containerSize }]}>
        
        {/* Hexágono exterior (Cores EXATAS da Splash) */}
        <View style={[
          styles.hexagon, 
          { width: hexSize, height: hexSize, borderColor: 'rgba(59, 130, 246, 0.5)' }
        ]}>
          <View style={[
            styles.hexagonSide, 
            { width: '100%', height: '100%', borderColor: 'rgba(59, 130, 246, 0.3)' }
          ]} />
        </View>
        
        {/* Letra N estilizada (Cores EXATAS da Splash) */}
        <View style={[styles.letterN, { width: innerSize, height: innerSize }]}>
          {/* Linha Vertical Esquerda */}
          <View style={[
            styles.nLine, 
            { left: 5 * scale, top: 5 * scale, width: 8 * scale, height: 60 * scale, backgroundColor: '#FFFFFF' }
          ]} />
          {/* Linha Vertical Direita */}
          <View style={[
            styles.nLine, 
            { right: 5 * scale, top: 5 * scale, width: 8 * scale, height: 60 * scale, backgroundColor: '#FFFFFF' }
          ]} />
          {/* Linha Diagonal */}
          <View style={[
            styles.nDiagonal, 
            { left: 18 * scale, top: 25 * scale, width: 34 * scale, height: 8 * scale, backgroundColor: '#3B82F6' }
          ]} />
        </View>
      </View>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.appName, { fontSize: size === 'small' ? 24 : size === 'medium' ? 40 : 64 }]}>
            <Text style={{ color: colors.text.primary, fontWeight: '800', letterSpacing: -2 }}>Nex</Text>
            <Text style={{ color: '#3B82F6', fontWeight: '800', letterSpacing: -2 }}>Work</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  logoContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  hexagon: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 3,
    transform: [{ rotate: '45deg' }],
  },
  hexagonSide: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 3,
  },
  letterN: { position: 'relative' },
  nLine: { position: 'absolute', borderRadius: 4 },
  nDiagonal: { position: 'absolute', borderRadius: 4, transform: [{ rotate: '45deg' }] },
  textContainer: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  appName: { fontFamily: 'System, -apple-system, sans-serif' },
});