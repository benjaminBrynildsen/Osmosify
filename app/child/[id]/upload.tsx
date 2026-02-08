import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function UploadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, addSession } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  
  const [bookTitle, setBookTitle] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'review'>('upload');
  const [loading, setLoading] = useState(false);
  
  const handleSave = async () => {
    if (!extractedText.trim()) return;
    
    setLoading(true);
    try {
      await addSession(
        id,
        bookTitle.trim() || 'Reading Session',
        extractedText.trim()
      );
      router.back();
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>New Session</Text>
        <View style={styles.placeholder} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Book Title Input */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Book Title (optional)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background,
                color: colors.onSurface,
                borderColor: colors.outline,
              }]}
              placeholder="Enter the book name..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={bookTitle}
              onChangeText={setBookTitle}
            />
          </View>
          
          {/* Tab Switcher */}
          <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'upload' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab('upload')}
            >
              <Ionicons 
                name="camera" 
                size={18} 
                color={activeTab === 'upload' ? colors.onPrimary : colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'upload' ? colors.onPrimary : colors.onSurfaceVariant }
              ]}>
                Upload
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'review' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab('review')}
            >
              <Ionicons 
                name="document-text" 
                size={18} 
                color={activeTab === 'review' ? colors.onPrimary : colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'review' ? colors.onPrimary : colors.onSurfaceVariant }
              ]}>
                Review
              </Text>
              {extractedText.length > 0 && (
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.uploadArea}>
                <Ionicons name="camera" size={48} color={colors.primary} />
                <Text style={[styles.uploadTitle, { color: colors.onSurface }]}>
                  Manual Entry
                </Text>
                <Text style={[styles.uploadDescription, { color: colors.onSurfaceVariant }]}>
                  Type or paste text from a book to extract words for your child's library.
                </Text>
                <TouchableOpacity 
                  style={[styles.switchButton, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab('review')}
                >
                  <Text style={[styles.switchButtonText, { color: colors.onPrimary }]}>
                    Enter Text
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Review Tab */}
          {activeTab === 'review' && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Extracted Text</Text>
                <Text style={[styles.editHint, { color: colors.onSurfaceVariant }]}>
                  Edit to add or remove words
                </Text>
              </View>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: colors.background,
                  color: colors.onSurface,
                  borderColor: colors.outline,
                }]}
                placeholder="Enter or paste text here..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={extractedText}
                onChangeText={setExtractedText}
                multiline
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { 
                    backgroundColor: extractedText.trim() ? colors.primary : colors.surfaceVariant,
                    opacity: extractedText.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleSave}
                disabled={!extractedText.trim() || loading}
              >
                {loading ? (
                  <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                    Processing...
                  </Text>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                    <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                      Save Session
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
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
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 4,
  },
  uploadArea: {
    alignItems: 'center',
    padding: 32,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  uploadDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  switchButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editHint: {
    fontSize: 12,
  },
  textArea: {
    minHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});