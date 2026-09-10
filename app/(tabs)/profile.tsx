// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const { colors, spacing, borderRadius, fontSize, toggleTheme, isDark } = useTheme();
  
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [userType, setUserType] = useState<'normal' | 'company'>('normal');

  useEffect(() => {
    if (editing && profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setUserType(profile.user_type || 'normal');
    }
  }, [editing, profile]);

  const handleSave = async () => {
    const updates: any = { phone, bio, location, user_type: userType };
    if (userType === 'normal') {
      updates.full_name = fullName;
      updates.company_name = null;
    } else {
      updates.company_name = companyName;
      updates.full_name = null;
    }

    const { error } = await updateProfile(updates);
    if (error) Alert.alert('Erro', 'Falha ao atualizar perfil: ' + error.message);
    else {
      Alert.alert('Sucesso', 'Perfil atualizado!');
      setEditing(false);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Carregando perfil...</Text>
      </View>
    );
  }

  const getLevelColor = (level: string) => {
    const colors_map: Record<string, string> = { Bronze: '#CD7F32', Prata: '#C0C0C0', Ouro: '#FFD700', Platina: '#E5E4E2' };
    return colors_map[level] || colors.primary;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cabeçalho do Perfil */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {/* Botão de Tema no Canto Superior Direito */}
          <TouchableOpacity style={[styles.themeToggle, { backgroundColor: colors.surfaceLight }]} onPress={toggleTheme} activeOpacity={0.7}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.primary} />
            <Text style={[styles.themeToggleText, { color: colors.text.secondary }]}>{isDark ? 'Claro' : 'Escuro'}</Text>
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name={profile.user_type === 'company' ? "business" : "person"} size={48} color={colors.primary} />
              </View>
            )}
            {profile.is_available_now && (
              <View style={[styles.availableBadge, { backgroundColor: colors.success, borderColor: colors.surface }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: colors.text.primary }]}>
            {profile.user_type === 'company' ? profile.company_name : profile.full_name}
          </Text>
          <Text style={[styles.email, { color: colors.text.secondary }]}>{profile.email}</Text>

          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(profile.level) }]}>
            <Text style={styles.levelText}>{profile.level}</Text>
          </View>

          <View style={styles.trustScoreContainer}>
            <Text style={[styles.trustScoreLabel, { color: colors.text.secondary }]}>Trust Score</Text>
            <Text style={[styles.trustScoreValue, { color: colors.primary }]}>{profile.trust_score}/100</Text>
          </View>
        </View>

        {/* Informações do Perfil */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informações</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Tipo de Conta</Text>
              <View style={styles.userTypeContainer}>
                <TouchableOpacity style={[styles.userTypeButton, { borderColor: colors.border, backgroundColor: userType === 'normal' ? colors.primary : colors.surface }]} onPress={() => setUserType('normal')}>
                  <Ionicons name="person-outline" size={20} color={userType === 'normal' ? '#FFFFFF' : colors.text.secondary} />
                  <Text style={[styles.userTypeText, { color: userType === 'normal' ? '#FFFFFF' : colors.text.secondary }]}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.userTypeButton, { borderColor: colors.border, backgroundColor: userType === 'company' ? colors.primary : colors.surface }]} onPress={() => setUserType('company')}>
                  <Ionicons name="business-outline" size={20} color={userType === 'company' ? '#FFFFFF' : colors.text.secondary} />
                  <Text style={[styles.userTypeText, { color: userType === 'company' ? '#FFFFFF' : colors.text.secondary }]}>Empresa</Text>
                </TouchableOpacity>
              </View>

              {userType === 'normal' ? (
                <Input label="Nome Completo" value={fullName} onChangeText={setFullName} icon="person-outline" />
              ) : (
                <Input label="Nome da Empresa" value={companyName} onChangeText={setCompanyName} icon="business-outline" />
              )}
              <Input label="Telefone" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" />
              <Input label="Localização" value={location} onChangeText={setLocation} icon="location-outline" />
              <Input label="Bio / Descrição" value={bio} onChangeText={setBio} icon="text-outline" multiline />

              <View style={styles.buttonContainer}>
                <Button title="Salvar" onPress={handleSave} variant="primary" size="medium" />
                <Button title="Cancelar" onPress={() => setEditing(false)} variant="outline" size="medium" />
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Ionicons name={profile.user_type === 'company' ? "business-outline" : "person-outline"} size={20} color={colors.text.secondary} />
                <Text style={[styles.infoText, { color: colors.text.primary }]}>{profile.user_type === 'company' ? profile.company_name : profile.full_name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.infoText, { color: colors.text.primary }]}>{profile.phone || 'Não definido'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.infoText, { color: colors.text.primary }]}>{profile.location || 'Não definido'}</Text>
              </View>
              {profile.bio && (
                <View style={styles.infoItem}>
                  <Ionicons name="text-outline" size={20} color={colors.text.secondary} />
                  <Text style={[styles.infoText, { color: colors.text.primary }]}>{profile.bio}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Estatísticas */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Estatísticas</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile.completed_jobs}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Trabalhos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile.trust_score}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Trust Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile.level}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Nível</Text>
            </View>
          </View>
        </View>

        {/* Toggle Disponível Agora */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Disponibilidade</Text>
          <TouchableOpacity style={styles.availableToggle} onPress={async () => {
            const { error } = await updateProfile({ is_available_now: !profile.is_available_now });
            if (error) Alert.alert('Erro', 'Falha ao atualizar disponibilidade');
          }}>
            <View style={[styles.toggleSwitch, { backgroundColor: profile.is_available_now ? colors.success : colors.border }]}>
              <View style={[styles.toggleCircle, { backgroundColor: colors.surface, transform: [{ translateX: profile.is_available_now ? 22 : 0 }] }]} />
            </View>
            <Text style={[styles.availableText, { color: colors.text.primary }]}>
              {profile.is_available_now ? 'Disponível Agora' : 'Indisponível'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  header: { padding: 24, alignItems: 'center', borderBottomWidth: 1, position: 'relative' },
  themeToggle: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  themeToggleText: { fontSize: 12, fontWeight: '600' },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  availableBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 15, marginBottom: 12 },
  levelBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  levelText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  trustScoreContainer: { alignItems: 'center' },
  trustScoreLabel: { fontSize: 13 },
  trustScoreValue: { fontSize: 28, fontWeight: '800' },
  section: { padding: 20, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  infoList: { gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 15, flex: 1 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  userTypeContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  userTypeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  userTypeText: { fontSize: 15, fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 4 },
  availableToggle: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  toggleSwitch: { width: 56, height: 32, borderRadius: 16, padding: 4, justifyContent: 'center' },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  availableText: { fontSize: 16, fontWeight: '600' },
});