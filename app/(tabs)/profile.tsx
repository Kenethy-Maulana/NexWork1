import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../styles/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  
  // Estados do formulário
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [userType, setUserType] = useState<'normal' | 'company'>('normal');

  // Carregar dados no formulário quando entrar no modo de edição
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
    const updates: any = {
      phone,
      bio,
      location,
      user_type: userType,
    };

    if (userType === 'normal') {
      updates.full_name = fullName;
      updates.company_name = null;
    } else {
      updates.company_name = companyName;
      updates.full_name = null;
    }

    const { error } = await updateProfile(updates);

    if (error) {
      Alert.alert('Erro', 'Falha ao atualizar perfil: ' + error.message);
    } else {
      Alert.alert('Sucesso', 'Perfil atualizado!');
      setEditing(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  const getLevelColor = (level: string) => {
    const colors_map: Record<string, string> = {
      Bronze: '#CD7F32',
      Prata: '#C0C0C0',
      Ouro: '#FFD700',
      Platina: '#E5E4E2',
    };
    return colors_map[level] || colors.primary;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cabeçalho do Perfil */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name={profile.user_type === 'company' ? "business" : "person"} size={48} color={colors.primary} />
              </View>
            )}
            {profile.is_available_now && (
              <View style={styles.availableBadge}>
                <Ionicons name="checkmark" size={12} color={colors.surface} />
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {profile.user_type === 'company' ? profile.company_name : profile.full_name}
          </Text>
          <Text style={styles.email}>{profile.email}</Text>

          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(profile.level) }]}>
            <Text style={styles.levelText}>{profile.level}</Text>
          </View>

          <View style={styles.trustScoreContainer}>
            <Text style={styles.trustScoreLabel}>Trust Score</Text>
            <Text style={styles.trustScoreValue}>{profile.trust_score}/100</Text>
          </View>
        </View>

        {/* Informações do Perfil */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informações</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.form}>
              {/* Seleção de Tipo de Usuário */}
              <Text style={styles.label}>Tipo de Conta</Text>
              <View style={styles.userTypeContainer}>
                <TouchableOpacity
                  style={[styles.userTypeButton, userType === 'normal' && styles.userTypeButtonActive]}
                  onPress={() => setUserType('normal')}
                >
                  <Ionicons name="person-outline" size={20} color={userType === 'normal' ? colors.surface : colors.text.secondary} />
                  <Text style={[styles.userTypeText, userType === 'normal' && styles.userTypeTextActive]}>Normal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.userTypeButton, userType === 'company' && styles.userTypeButtonActive]}
                  onPress={() => setUserType('company')}
                >
                  <Ionicons name="business-outline" size={20} color={userType === 'company' ? colors.surface : colors.text.secondary} />
                  <Text style={[styles.userTypeText, userType === 'company' && styles.userTypeTextActive]}>Empresa</Text>
                </TouchableOpacity>
              </View>

              {/* Campos Condicionais */}
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
                <Text style={styles.infoText}>
                  {profile.user_type === 'company' ? profile.company_name : profile.full_name}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.infoText}>{profile.phone || 'Não definido'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.infoText}>{profile.location || 'Não definido'}</Text>
              </View>
              {profile.bio && (
                <View style={styles.infoItem}>
                  <Ionicons name="text-outline" size={20} color={colors.text.secondary} />
                  <Text style={styles.infoText}>{profile.bio}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Estatísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.completed_jobs}</Text>
              <Text style={styles.statLabel}>Trabalhos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.trust_score}</Text>
              <Text style={styles.statLabel}>Trust Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.level}</Text>
              <Text style={styles.statLabel}>Nível</Text>
            </View>
          </View>
        </View>

        {/* Toggle Disponível Agora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilidade</Text>
          <TouchableOpacity
            style={styles.availableToggle}
            onPress={async () => {
              const { error } = await updateProfile({ is_available_now: !profile.is_available_now });
              if (error) Alert.alert('Erro', 'Falha ao atualizar disponibilidade');
            }}
          >
            <View style={[styles.toggleSwitch, profile.is_available_now && styles.toggleSwitchActive]}>
              <View style={[styles.toggleCircle, profile.is_available_now && styles.toggleCircleActive]} />
            </View>
            <Text style={styles.availableText}>
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
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.text.secondary },
  header: { backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  avatarContainer: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  availableBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  name: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  email: { fontSize: fontSize.md, color: colors.text.secondary, marginBottom: spacing.md },
  levelBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginBottom: spacing.md },
  levelText: { color: colors.surface, fontWeight: '600', fontSize: fontSize.sm },
  trustScoreContainer: { alignItems: 'center' },
  trustScoreLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  trustScoreValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  section: { backgroundColor: colors.surface, padding: spacing.lg, marginTop: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.md },
  infoList: { gap: spacing.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontSize: fontSize.md, color: colors.text.primary, flex: 1 },
  form: { gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text.primary, marginBottom: spacing.xs },
  userTypeContainer: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  userTypeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  userTypeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  userTypeText: { fontSize: fontSize.md, color: colors.text.secondary, fontWeight: '500' },
  userTypeTextActive: { color: colors.surface, fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  availableToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleSwitch: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2 },
  toggleSwitchActive: { backgroundColor: colors.success },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
  toggleCircleActive: { transform: [{ translateX: 22 }] },
  availableText: { fontSize: fontSize.md, color: colors.text.primary },
});