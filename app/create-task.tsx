// app/create-task.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'eletrica', label: 'Elétrica', icon: 'flash-outline' },
  { id: 'encanamento', label: 'Encanamento', icon: 'water-outline' },
  { id: 'pintura', label: 'Pintura', icon: 'color-palette-outline' },
  { id: 'limpeza', label: 'Limpeza', icon: 'sparkles-outline' },
  { id: 'mudancas', label: 'Mudanças', icon: 'cube-outline' },
  { id: 'ti', label: 'TI / Computadores', icon: 'laptop-outline' },
  { id: 'outros', label: 'Outros', icon: 'construct-outline' },
];

export default function CreateTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // 🗺️ FUNÇÃO PARA GEOCODIFICAR ENDEREÇO EM COORDENADAS
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      return null;
    }
  };

  // 📍 FUNÇÃO PARA PEGAR LOCALIZAÇÃO ATUAL DO GPS
  const getCurrentLocation = async () => {
    setGettingLocation(true);
    
    try {
      // Pedir permissão
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'É necessário permitir o acesso à localização para usar esta função.');
        return;
      }

      // Pegar localização atual
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      console.log('📍 Localização GPS:', latitude, longitude);

      // Geocodificação reversa: coordenadas → endereço
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const formattedAddress = `${address.street || ''}, ${address.district || address.city || ''}`.trim();
        setLocation(formattedAddress || `${latitude}, ${longitude}`);
        Alert.alert('✅ Localização Encontrada', `Endereço: ${formattedAddress || 'Coordenadas capturadas'}`);
      } else {
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (error: any) {
      console.error('Erro ao pegar localização:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização. Verifique se o GPS está ativado.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCreateTask = async () => {
    if (!title || !description || !category || !location || !budget) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (!user) {
      alert('Você precisa estar logado para criar uma tarefa.');
      return;
    }

    setLoading(true);

    try {
      // 1. Buscar coordenadas da localização
      console.log('📍 A buscar coordenadas para:', location);
      const coords = await geocodeAddress(location);
      
      let latitude = null;
      let longitude = null;
      let locationName = location;

      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log('✅ Coordenadas encontradas:', latitude, longitude);
      } else {
        console.warn('⚠️ Não foi possível geocodificar. Usando coordenadas padrão de Maputo.');
        latitude = -25.9655;
        longitude = 32.5832;
      }

      // 2. Inserir tarefa com as coordenadas
      const { error } = await supabase.from('tasks').insert({
        client_id: user.id,
        title,
        description,
        category,
        location,
        location_name: locationName,
        budget: parseFloat(budget.replace(',', '.')),
        status: 'open',
        latitude,
        longitude,
      });

      setLoading(false);

      if (error) {
        console.error('Erro ao criar tarefa:', error);
        alert('Não foi possível criar a tarefa. Tente novamente.');
      } else {
        alert('✅ Tarefa criada com sucesso!');
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Erro inesperado:', err);
      alert('Erro: ' + err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Tarefa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input 
            label="Título da Tarefa" 
            placeholder="Ex: Instalar 3 tomadas na sala" 
            value={title} 
            onChangeText={setTitle} 
            icon="document-text-outline" 
          />

          <Text style={styles.label}>Categoria do Serviço</Text>
          <View style={styles.categoriesContainer}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={18} 
                    color={isActive ? colors.surface : colors.text.secondary} 
                  />
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input 
            label="Descrição Detalhada" 
            placeholder="Descreva o que precisa ser feito, materiais inclusos, etc." 
            value={description} 
            onChangeText={setDescription} 
            icon="text-outline" 
            multiline={true}
            numberOfLines={4}
          />

          {/* 📍 CAMPO DE LOCALIZAÇÃO COM BOTÃO GPS */}
          <View>
            <Text style={styles.label}>Localização da Tarefa</Text>
            <View style={styles.locationContainer}>
              <View style={styles.locationInputWrapper}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
                <Input 
                  placeholder="Ex: Maputo, Bairro Polana" 
                  value={location} 
                  onChangeText={setLocation} 
                  style={styles.locationInput}
                />
              </View>
              <TouchableOpacity 
                style={[styles.gpsButton, gettingLocation && styles.gpsButtonDisabled]}
                onPress={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="navigate" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.locationHint}>
               Clique no botão 📍 para usar sua localização atual
            </Text>
          </View>

          <Input 
            label="Orçamento Previsto (MT)" 
            placeholder="Ex: 2500" 
            value={budget} 
            onChangeText={setBudget} 
            icon="cash-outline" 
            keyboardType="numeric" 
          />

          <View style={styles.buttonContainer}>
            <Button 
              title="Publicar Tarefa" 
              onPress={handleCreateTask} 
              variant="primary" 
              size="large" 
              fullWidth={true}
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },
  headerSpacer: { width: 40 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  categoryChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.full, 
    borderWidth: 1, 
    borderColor: colors.border, 
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: '500' },
  categoryTextActive: { color: colors.surface, fontWeight: '600' },
  
  // Novos estilos para localização GPS
  locationContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  locationInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  locationInput: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  gpsButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  locationHint: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  
  buttonContainer: { marginTop: spacing.lg, marginBottom: spacing.xl },
});