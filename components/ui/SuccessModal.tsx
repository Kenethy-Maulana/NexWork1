// components/ui/SuccessModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { Button } from './Button';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ 
  visible, 
  title, 
  message, 
  onClose, 
  iconName = 'checkmark-circle' 
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name={iconName} size={64} color={colors.success} />
          </View>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.modalMessage, { color: colors.text.secondary }]}>{message}</Text>
          <Button title="OK" onPress={onClose} variant="primary" size="large" fullWidth />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  iconBox: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});