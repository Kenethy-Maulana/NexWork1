// components/SplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animações principais
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const lineExpand = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  
  // Partículas
  const [particles] = useState(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.5 + 0.2,
    }))
  );

  const particleAnims = useRef(
    particles.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Animação das partículas (movimento contínuo)
    particleAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Sequência de entrada profissional
    Animated.sequence([
      // 1. Logo aparece com rotação e scale
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      
      // 2. Texto "NexWork" aparece
      Animated.timing(textFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      
      // 3. Tagline aparece
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      
      // 4. Linha decorativa expande
      Animated.spring(lineExpand, {
        toValue: 1,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulso de brilho contínuo
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Tempo total: 3.5 segundos
    const timer = setTimeout(() => {
      onFinish();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const rotateInterpolation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#0A0E27', '#1E3A8A', '#0F172A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Partículas flutuantes (rede de profissionais) */}
      {particles.map((particle, i) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              left: particle.x,
              top: particle.y,
              opacity: particle.opacity,
              transform: [
                {
                  translateY: particleAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -100],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Ondas de energia (conexão) */}
      <View style={styles.waveContainer}>
        <View style={[styles.wave, styles.wave1]} />
        <View style={[styles.wave, styles.wave2]} />
        <View style={[styles.wave, styles.wave3]} />
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.content}>
        {/* Logo Animado */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { rotate: rotateInterpolation },
              ],
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: glowPulse },
            ]}
          />
          
          {/* Logo "N" Profissional */}
          <View style={styles.logoInner}>
            {/* Hexágono exterior */}
            <View style={styles.hexagon}>
              <View style={styles.hexagonSide} />
            </View>
            
            {/* Letra N estilizada */}
            <View style={styles.letterN}>
              <View style={styles.nLine1} />
              <View style={styles.nLine2} />
              <View style={styles.nLine3} />
            </View>
          </View>
        </Animated.View>

        {/* Texto "NexWork" */}
        <Animated.View style={{ opacity: textFade }}>
          <Text style={styles.appName}>
            <Text style={styles.nexText}>Nex</Text>
            <Text style={styles.workText}>Work</Text>
          </Text>
        </Animated.View>

        {/* Tagline e linha decorativa */}
        <Animated.View 
          style={[
            styles.taglineContainer,
            { opacity: taglineFade },
          ]}
        >
          <Text style={styles.tagline}>O futuro do trabalho, simplificado.</Text>
          
          <Animated.View
            style={[
              styles.decorativeLine,
              {
                transform: [{ scaleX: lineExpand }],
              },
            ]}
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#3B82F6',
    borderRadius: 9999,
  },
  waveContainer: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  wave1: {
    width: '60%',
    height: '60%',
  },
  wave2: {
    width: '80%',
    height: '80%',
  },
  wave3: {
    width: '100%',
    height: '100%',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: 160,
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
logoGlow: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(59, 130, 246, 0.3)',
  // Efeito de glow compatível com todas as plataformas
  shadowColor: '#3B82F6',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 40,
  elevation: 20, // Para Android
},
  logoInner: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexagon: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    transform: [{ rotate: '45deg' }],
  },
  hexagonSide: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  letterN: {
    width: 70,
    height: 70,
    position: 'relative',
  },
  nLine1: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 8,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  nLine2: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 8,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  nLine3: {
    position: 'absolute',
    left: 18,
    top: 25,
    width: 34,
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  appName: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    fontFamily: 'System, -apple-system, sans-serif',
    marginBottom: 8,
  },
  nexText: {
    color: '#FFFFFF',
  },
  workText: {
    color: '#3B82F6',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: 'System, -apple-system, sans-serif',
    marginBottom: 20,
  },
  decorativeLine: {
    width: 100,
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
});