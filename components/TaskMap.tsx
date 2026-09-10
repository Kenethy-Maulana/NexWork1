import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { supabase } from '../lib/supabase';

// ==========================================
// 🌍 CONFIGURAÇÃO WEB (LEAFLET)
// ==========================================
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any, L: any;
let isLeafletLoaded = false;

if (Platform.OS === 'web') {
  try {
    // Importa o CSS do Leaflet (crucial para o mapa aparecer)
    require('leaflet/dist/leaflet.css');
    const leaflet = require('react-leaflet');
    L = require('leaflet');
    
    MapContainer = leaflet.MapContainer;
    TileLayer = leaflet.TileLayer;
    Marker = leaflet.Marker;
    Popup = leaflet.Popup;
    useMap = leaflet.useMap;
    isLeafletLoaded = true;
  } catch (error) {
    console.error('❌ Erro ao carregar Leaflet. Executa: npm install react-leaflet leaflet', error);
  }
}

// ==========================================
// 📱 CONFIGURAÇÃO MOBILE (REACT NATIVE MAPS)
// ==========================================
let RNMapView: any = null;
let RNMarker: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    RNMapView = maps.default;
    RNMarker = maps.Marker;
  } catch (error) {
    console.warn('⚠️ react-native-maps não encontrado.');
  }
}

const { width, height } = Dimensions.get('window');

// ==========================================
// 🎯 COMPONENTE PARA CENTRAR O MAPA (WEB)
// ==========================================
function MapController({ center }: { center: [number, number] | null }) {
  if (Platform.OS !== 'web' || !useMap) return null;
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// ==========================================
// 🎨 ÍCONE CUSTOMIZADO DO PIN (WEB)
// ==========================================
function createCustomIcon(category: string, isSelected: boolean, themeColors: any) {
  const icons: Record<string, string> = {
    eletrica: '⚡', encanamento: '💧', pintura: '🎨',
    limpeza: '🧹', mudancas: '📦', ti: '💻', outros: '🔧',
  };
  const emoji = icons[category] || '📋';
  const size = isSelected ? 50 : 40;
  const bgColor = isSelected ? themeColors.text.primary : themeColors.primary;
  const borderColor = isSelected ? themeColors.primary : themeColors.surface;
  
  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background-color: ${bgColor};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: ${isSelected ? '24px' : '20px'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      ">${emoji}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function TaskMap() {
  const router = useRouter();
  const { colors, borderRadius } = useTheme();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const listRef = useRef<any>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, category, budget, latitude, longitude, location_name')
        .eq('status', 'open')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // ✅ CORREÇÃO CRÍTICA: Garantir que são NÚMEROS para evitar crash no mobile
      const safeTasks = (data || []).map((task: any) => ({
        ...task,
        latitude: Number(task.latitude),
        longitude: Number(task.longitude)
      }));
      
      setTasks(safeTasks);
    } catch (err) {
      console.error('Erro ao buscar tarefas para o mapa:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      eletrica: '⚡', encanamento: '💧', pintura: '🎨',
      limpeza: '🧹', mudancas: '📦', ti: '💻', outros: '🔧',
    };
    return icons[category] || '📋';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    if (Platform.OS === 'web' && listRef.current) {
      const taskElement = document.getElementById(`task-card-${task.id}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar mapa...</Text>
      </View>
    );
  }

  // ==========================================
  // 🌍 RENDERIZAÇÃO WEB COMPLETA (LEAFLET)
  // ==========================================
  if (Platform.OS === 'web') {
    if (!isLeafletLoaded) {
      return (
        <View style={[styles.fallbackMap, { backgroundColor: colors.background }]}>
          <Ionicons name="warning" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text.primary, marginTop: 12 }]}>Leaflet não instalado</Text>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>
            Executa no terminal: `npm install react-leaflet leaflet` e reinicia o servidor.
          </Text>
        </View>
      );
    }

    return (
      <div style={{ 
        display: 'flex', height: 'calc(100vh - 60px)', width: '100%', 
        backgroundColor: colors.background, overflow: 'hidden' 
      }}>
        {/* Lado Esquerdo: Lista de Tarefas */}
        <div style={{ 
          width: '380px', borderRight: `1px solid ${colors.border}`, 
          display: 'flex', flexDirection: 'column', backgroundColor: colors.surface 
        }}>
          <div style={{ 
            padding: '20px', borderBottom: `1px solid ${colors.border}`,
            background: `linear-gradient(135deg, ${colors.primary} 0%, #2563EB 100%)`,
            color: '#FFFFFF'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
              📍 {tasks.length} Tarefas Disponíveis
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.9 }}>
              Clica numa tarefa para ver no mapa
            </p>
          </div>
          
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              return (
                <div 
                  key={task.id}
                  id={`task-card-${task.id}`}
                  onClick={() => handleSelectTask(task)}
                  style={{ 
                    padding: '16px', marginBottom: '12px', borderRadius: '12px', 
                    border: `2px solid ${isSelected ? colors.primary : 'transparent'}`,
                    backgroundColor: isSelected ? colors.primary + '15' : colors.background,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 4px 12px ${colors.primary}33` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '24px', width: '44px', height: '44px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
                      borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      {getCategoryIcon(task.category)}
                    </span>
                    <span style={{ 
                      fontSize: '15px', fontWeight: '700', color: colors.success,
                      backgroundColor: colors.success + '20', padding: '4px 10px', borderRadius: '8px'
                    }}>
                      {formatCurrency(task.budget)}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '600', color: colors.text.primary }}>
                    {task.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📍 {task.location_name || 'Localização'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Mapa Interativo */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer 
            center={[-25.9655, 32.5832]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <MapController center={selectedTask ? [selectedTask.latitude, selectedTask.longitude] : null} />
            
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {tasks.map((task) => (
              <Marker 
                key={task.id} 
                position={[task.latitude, task.longitude]}
                icon={createCustomIcon(task.category, selectedTask?.id === task.id, colors)}
                eventHandlers={{ click: () => handleSelectTask(task) }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: '180px', padding: '8px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                      {getCategoryIcon(task.category)}
                    </div>
                    <strong style={{ fontSize: '15px', display: 'block', marginBottom: '6px', color: colors.text.primary }}>
                      {task.title}
                    </strong>
                    <span style={{ color: colors.success, fontWeight: 'bold', fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                      {formatCurrency(task.budget)}
                    </span>
                    <p style={{ fontSize: '12px', color: colors.text.secondary, margin: '0 0 10px' }}>
                      📍 {task.location_name || 'Localização'}
                    </p>
                    <button 
                      onClick={() => router.push({ pathname: '/task-details', params: { id: task.id } })}
                      style={{ 
                        marginTop: '4px', padding: '8px 16px', backgroundColor: colors.primary, 
                        color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', 
                        fontSize: '13px', fontWeight: '600', width: '100%'
                      }}
                    >
                      Ver Detalhes →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    );
  }

  // ==========================================
  // 📱 RENDERIZAÇÃO MOBILE (REACT NATIVE MAPS)
  // ==========================================
  if (!RNMapView) {
    return (
      <View style={[styles.fallbackMap, { backgroundColor: colors.background }]}>
        <Ionicons name="map-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text.primary, marginTop: 12 }]}>Mapa indisponível</Text>
        <Text style={[styles.errorText, { color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 20 }]}>
          Executa no terminal: `npx expo install react-native-maps` e depois `npx expo run:android`
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.mobileContainer, { backgroundColor: colors.background }]}>
      <RNMapView
        style={styles.map}
        initialRegion={{ 
          latitude: tasks.length > 0 ? tasks[0].latitude : -25.9655, 
          longitude: tasks.length > 0 ? tasks[0].longitude : 32.5832, 
          latitudeDelta: 0.0922, 
          longitudeDelta: 0.0421 
        }}
        showsUserLocation={true}
      >
        {tasks.map((task) => {
          if (!task.latitude || !task.longitude || isNaN(task.latitude) || isNaN(task.longitude)) return null;
          return (
            <RNMarker
              key={task.id}
              coordinate={{ latitude: task.latitude, longitude: task.longitude }}
              title={task.title}
              description={`Orçamento: ${formatCurrency(task.budget)}`}
              onPress={() => handleSelectTask(task)}
            >
              <View style={[
                styles.customMarker, 
                { backgroundColor: colors.primary, borderColor: colors.surface },
                selectedTask?.id === task.id && { backgroundColor: colors.text.primary, borderColor: colors.primary }
              ]}>
                <Text style={{ fontSize: 20 }}>{getCategoryIcon(task.category)}</Text>
              </View>
            </RNMarker>
          );
        })}
      </RNMapView>

      {selectedTask && (
        <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text.primary }]} numberOfLines={1}>{selectedTask.title}</Text>
            <TouchableOpacity onPress={() => setSelectedTask(null)}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.bottomSheetPrice, { color: colors.success }]}>{formatCurrency(selectedTask.budget)}</Text>
          <Text style={[styles.bottomSheetLocation, { color: colors.text.secondary }]} numberOfLines={2}>
            📍 {selectedTask.location_name || 'Localização não especificada'}
          </Text>
          <TouchableOpacity 
            style={[styles.bottomSheetButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/task-details', params: { id: selectedTask.id } })}
          >
            <Text style={[styles.bottomSheetButtonText, { color: '#FFFFFF' }]}>Ver Detalhes da Tarefa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fallbackMap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  mobileContainer: { flex: 1, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  customMarker: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  bottomSheet: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    padding: 20, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  bottomSheetPrice: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  bottomSheetLocation: { fontSize: 14, marginBottom: 16 },
  bottomSheetButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  bottomSheetButtonText: { fontSize: 16, fontWeight: '700' },
});