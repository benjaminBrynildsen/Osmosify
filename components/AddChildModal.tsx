import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChildren } from '../contexts/ChildrenContext';
import { COLORS, useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface AddChildModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddChildModal({ visible, onClose }: AddChildModalProps) {
  const { addChild } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await addChild(name.trim(), gradeLevel.trim() || undefined);
      setName('');
      setGradeLevel('');
      onClose();
    } catch (error) {
      console.error('Error adding child:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setGradeLevel('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Add Child</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Name *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.onSurface,
                borderColor: colors.outline 
              }]}
              placeholder="Enter child's name"
              placeholderTextColor={colors.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Grade Level (optional)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.onSurface,
                borderColor: colors.outline 
              }]}
              placeholder="e.g., Kindergarten, 1st Grade"
              placeholderTextColor={colors.onSurfaceVariant}
              value={gradeLevel}
              onChangeText={setGradeLevel}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              { 
                backgroundColor: name.trim() ? colors.primary : colors.surfaceVariant,
                opacity: loading ? 0.7 : 1
              }
            ]}
            onPress={handleAdd}
            disabled={!name.trim() || loading}
          >
            <Text style={[
              styles.addButtonText,
              { color: name.trim() ? colors.onPrimary : colors.onSurfaceVariant }
            ]}>
              {loading ? 'Adding...' : 'Add Child'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});