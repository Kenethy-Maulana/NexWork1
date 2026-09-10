// app/create-task.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../styles/theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Calendar } from '../components/ui/Calendar';
import { SuccessModal } from '../components/ui/SuccessModal'; // ✅ ADICIONADO
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

const FREQUENCIES = [
  { id: 'daily', label: 'Diário' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensal' },
];

export default function CreateTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, borderRadius } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  
  const [locationName, setLocationName] = useState(''); 
  const [coords, setCoords] = useState<{ lat: number | null, lng: number | null }>({ lat: null, lng: null });
  const [budget, setBudget] = useState('');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [endDate, setEndDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // ✅ ADICIONADO

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'É necessário permitir o acesso à localização.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = currentLocation.coords;

      setCoords({ lat: latitude, lng: longitude });

      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const friendlyAddress = `${addr.street || ''}, ${addr.city || addr.district || 'Moçambique'}`.replace(/^,\s*/, '');
        setLocationName(friendlyAddress);
      } else {
        setLocationName('Toque aqui para escrever o endereço manualmente');
        Alert.alert('📍 Localização Capturada', 'O nome exato da rua não foi encontrado. Podes editar o campo manualmente.');
      }
    } catch (error) {
      console.error('Erro ao pegar localização:', error);
      Alert.alert('Erro', 'Não foi possível obter a localização. Escreve o endereço manualmente.');
      setLocationName(''); 
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCreateTask = async () => {
    if (!title || !description || !category || !locationName || !budget) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (isRecurring && !endDate) {
      Alert.alert('Atenção', 'Por favor, seleciona uma data de término para a recorrência.');
      return;
    }
    if (!user) {
      Alert.alert('Atenção', 'Precisa de estar autenticado.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        client_id: user.id,
        title,
        description,
        category,
        location: locationName,
        location_name: locationName,
        budget: parseFloat(budget.replace(',', '.')),
        status: 'open',
        latitude: coords.lat,
        longitude: coords.lng,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        end_date: isRecurring ? endDate : null,
      });

      if (error) throw error;

      // ✅ SUBSTITUIU O ALERT PELO MODAL
      setShowSuccess(true);
      
    } catch (err: any) {
      console.error('Erro ao criar tarefa:', err);
      Alert.alert('Erro', err.message || 'Não foi possível criar a tarefa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Nova Tarefa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input label="Título da Tarefa *" placeholder="Ex: Instalar 3 tomadas na sala" value={title} onChangeText={setTitle} icon="document-text-outline" />
          
          <Text style={[styles.label, { color: colors.text.primary }]}>Categoria do Serviço *</Text>
          <View style={styles.categoriesContainer}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: isActive ? colors.primary : colors.border }]}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={cat.icon as any} size={18} color={isActive ? '#FFFFFF' : colors.text.secondary} />
                  <Text style={[styles.categoryText, { color: isActive ? '#FFFFFF' : colors.text.secondary, fontWeight: isActive ? '600' : '500' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input label="Descrição Detalhada *" placeholder="Descreva o que precisa ser feito..." value={description} onChangeText={setDescription} icon="text-outline" multiline numberOfLines={4} />

          <View>
            <Text style={[styles.label, { color: colors.text.primary }]}>Localização da Tarefa *</Text>
            <View style={styles.locationContainer}>
              <View style={{ flex: 1 }}>
                <Input placeholder="Localização" value={locationName} onChangeText={setLocationName} icon="location-outline" />
              </View>
              <TouchableOpacity style={[styles.gpsButton, { backgroundColor: gettingLocation ? colors.text.light : colors.primary }]} onPress={getCurrentLocation} disabled={gettingLocation} activeOpacity={0.7}>
                {gettingLocation ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="navigate" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>

          <Input label="Orçamento Previsto (MT) *" placeholder="Ex: 2500" value={budget} onChangeText={setBudget} icon="cash-outline" keyboardType="numeric" />

          <View style={[styles.recurringSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.recurringHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recurringTitle, { color: colors.text.primary }]}>Tarefa Recorrente?</Text>
                <Text style={[styles.recurringSubtitle, { color: colors.text.secondary }]}>Ex: Limpeza semanal, jardinagem mensal.</Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={isRecurring ? colors.primary : '#f4f3f4'}
              />
            </View>

            {isRecurring && (
              <View style={styles.recurringOptions}>
                <Text style={[styles.label, { color: colors.text.primary, marginBottom: 8 }]}>Frequência</Text>
                <View style={styles.freqRow}>
                  {FREQUENCIES.map((freq) => {
                    const isActive = recurrenceInterval === freq.id;
                    return (
                      <TouchableOpacity
                        key={freq.id}
                        style={[styles.freqChip, { backgroundColor: isActive ? colors.primary : colors.surfaceLight, borderColor: isActive ? colors.primary : colors.border }]}
                        onPress={() => setRecurrenceInterval(freq.id as any)}
                      >
                        <Text style={[styles.freqText, { color: isActive ? '#FFFFFF' : colors.text.secondary }]}>
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.text.primary, marginTop: 16, marginBottom: 8 }]}>Data de Término da Recorrência *</Text>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]} onPress={() => setShowCalendar(!showCalendar)}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.dateText, { color: endDate ? colors.text.primary : colors.text.light }]}>
                    {endDate ? new Date(endDate).toLocaleDateString('pt-MZ') : 'Selecionar data de fim'}
                  </Text>
                </TouchableOpacity>
                
                {showCalendar && (
                  <View style={styles.calendarContainer}>
                    <Calendar selectedDate={endDate} onDateSelect={(date) => { setEndDate(date); setShowCalendar(false); }} minDate={new Date().toISOString().split('T')[0]} />
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button title={isRecurring ? "Configurar Tarefa Recorrente" : "Publicar Tarefa"} onPress={handleCreateTask} variant="primary" size="large" fullWidth loading={loading} />
          </View>
        </View>
      </ScrollView>

      {/* ✅ MODAL DE SUCESSO */}
      <SuccessModal 
        visible={showSuccess} 
        title="Sucesso! 🎉" 
        message={isRecurring ? 'Tarefa recorrente configurada com sucesso!' : 'Tarefa criada com sucesso!'}
        onClose={() => {
          setShowSuccess(false);
          router.replace('/(tabs)');
        }} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  form: { gap: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 6 },
  categoryText: { fontSize: 13 },
  locationContainer: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  gpsButton: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonContainer: { marginTop: 16 },
  
  recurringSection: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  recurringHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recurringTitle: { fontSize: 16, fontWeight: '700' },
  recurringSubtitle: { fontSize: 13, marginTop: 4 },
  recurringOptions: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
  freqRow: { flexDirection: 'row', gap: 10 },
  freqChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  freqText: { fontSize: 13, fontWeight: '600' },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  dateText: { fontSize: 15, flex: 1 },
  calendarContainer: { marginTop: 8 },
});