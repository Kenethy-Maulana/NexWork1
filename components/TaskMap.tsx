import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { supabase } from '../lib/supabase';

// Debug: Verifica qual plataforma está a ser detetada
console.log('🌍 Platform.OS detectado como:', Platform.OS);

// ==========================================
// 🌍 IMPORTAÇÕES WEB (LEAFLET - OPENSTREETMAP)
// ==========================================
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any, L: any;
let isLeafletLoaded = false;

if (Platform.OS === 'web') {
  try {
    const leaflet = require('react-leaflet');
    L = require('leaflet');
    require('leaflet/dist/leaflet.css');
    
    MapContainer = leaflet.MapContainer;
    TileLayer = leaflet.TileLayer;
    Marker = leaflet.Marker;
    Popup = leaflet.Popup;
    useMap = leaflet.useMap;
    isLeafletLoaded = true;
    console.log('✅ Leaflet carregado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao carregar Leaflet:', error);
  }
}

// ==========================================
// 📱 IMPORTAÇÕES MOBILE (REACT NATIVE MAPS)
// ==========================================
let RNMapView: any, RNMarker: any;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    RNMapView = maps.default;
    RNMarker = maps.Marker;
  } catch (error) {
    console.error('❌ Erro ao carregar react-native-maps:', error);
  }
}

const { width, height } = Dimensions.get('window');

// ==========================================
// 🎯 COMPONENTE QUE CONTROLA O MAPA (CENTRAR)
// ==========================================
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// ==========================================
// 🎨 CRIAR ÍCONE CUSTOMIZADO DO PIN
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
        width: ${size}px;
        height: ${size}px;
        background-color: ${bgColor};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, category, budget, latitude, longitude, location_name')
      .eq('status', 'open')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false });

    if (error) console.error('Erro ao buscar tarefas para o mapa:', error);
    else setTasks(data || []);
    
    setLoading(false);
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
        <Text style={{ color: colors.text.secondary }}>A carregar mapa...</Text>
      </View>
    );
  }

  // ==========================================
  // 🛡️ FALLBACK DE ERRO PARA WEB
  // ==========================================
  if (Platform.OS === 'web' && !isLeafletLoaded) {
    return (
      <View style={[styles.mobileContainer, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="warning" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Leaflet não encontrado</Text>
        <Text style={[styles.errorText, { color: colors.text.secondary }]}>
          Para usar o mapa na Web, instala as dependências executando no terminal:
        </Text>
        <Text style={[styles.codeBlock, { color: colors.primary }]}>
          npm install react-leaflet leaflet
        </Text>
        <Text style={[styles.errorText, { color: colors.text.secondary, marginTop: 10 }]}>
          Depois, reinicia o servidor com: npx expo start -c
        </Text>
      </View>
    );
  }

  // ==========================================
  // 🌍 RENDERIZAÇÃO WEB (PREMIUM COM LEAFLET)
  // ==========================================
  if (Platform.OS === 'web' && isLeafletLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 150px)', 
        width: '100%', 
        backgroundColor: colors.background, 
        borderRadius: borderRadius.lg, 
        overflow: 'hidden', 
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        {/* Lado Esquerdo: Lista de Tarefas */}
        <div style={{ 
          width: '380px', 
          borderRight: `1px solid ${colors.border}`, 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: colors.surface 
        }}>
          <div style={{ 
            padding: '20px', 
            borderBottom: `1px solid ${colors.border}`,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            color: '#FFFFFF'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
              📍 {tasks.length} Tarefas Disponíveis
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.9 }}>
              Clique numa tarefa para ver no mapa
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
                    padding: '16px', 
                    marginBottom: '12px', 
                    borderRadius: '12px', 
                    border: `2px solid ${isSelected ? colors.primary : 'transparent'}`,
                    backgroundColor: isSelected ? colors.primary + '15' : colors.surfaceLight,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 4px 12px ${colors.primary}33` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '28px', width: '44px', height: '44px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
                      borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      {getCategoryIcon(task.category)}
                    </span>
                    <span style={{ 
                      fontSize: '16px', fontWeight: '700', color: colors.success,
                      backgroundColor: colors.success + '20', padding: '4px 10px', borderRadius: '8px'
                    }}>
                      {formatCurrency(task.budget)}
                    </span>
                  </div>
                  <h4 style={{ 
                    margin: '0 0 6px', fontSize: '15px', fontWeight: '600', 
                    color: colors.text.primary, lineHeight: '1.3'
                  }}>
                    {task.title}
                  </h4>
                  <p style={{ 
                    margin: 0, fontSize: '13px', color: colors.text.secondary,
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
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
            
            {/* ✅ ALTERAÇÃO AQUI: OpenStreetMap gratuito, sem API Key */}
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
                        fontSize: '13px', fontWeight: '600', width: '100%', transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
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
  return (
    <View style={[styles.mobileContainer, { backgroundColor: colors.background, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: 1 }]}>
      {RNMapView ? (
        <RNMapView
          style={styles.map}
          region={{ latitude: -25.9655, longitude: 32.5832, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {tasks.map((task) => (
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
                selectedTask?.id === task.id && { backgroundColor: colors.text.primary, borderColor: colors.primary, transform: [{ scale: 1.2 }] }
              ]}>
                <Text style={{ fontSize: 20 }}>{getCategoryIcon(task.category)}</Text>
              </View>
            </RNMarker>
          ))}
        </RNMapView>
      ) : (
        <View style={styles.fallbackMap}>
          <Text style={{ color: colors.text.secondary }}>Mapa não disponível nesta plataforma.</Text>
        </View>
      )}

      {selectedTask && (
        <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text.primary }]}>{selectedTask.title}</Text>
            <TouchableOpacity onPress={() => setSelectedTask(null)}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.bottomSheetPrice, { color: colors.success }]}>{formatCurrency(selectedTask.budget)}</Text>
          <Text style={[styles.bottomSheetLocation, { color: colors.text.secondary }]}>📍 {selectedTask.location_name}</Text>
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

// Estilos estáticos
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 400 },
  mobileContainer: { flex: 1, overflow: 'hidden' },
  fallbackMap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  codeBlock: { 
    fontSize: 14, 
    fontWeight: '600', 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 12,
    fontFamily: 'monospace'
  },
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