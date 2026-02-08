import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { Word } from '../../../types';

export default function LibraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words, getPresets, addWords } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  const childWords = useMemo(() => 
    words.filter(w => w.childId === id),
    [words, id]
  );
  
  const [filter, setFilter] = useState<'all' | 'new' | 'learning' | 'mastered'>('all');
  
  const filteredWords = useMemo(() => {
    switch (filter) {
      case 'new':
        return childWords.filter(w => w.status === 'new');
      case 'learning':
        return childWords.filter(w => w.status === 'learning');
      case 'mastered':
        return childWords.filter(w => w.status === 'mastered');
      default:
        return childWords;
    }
  }, [childWords, filter]);
  
  const stats = useMemo(() => ({
    total: childWords.length,
    new: childWords.filter(w => w.status === 'new').length,
    learning: childWords.filter(w => w.status === 'learning').length,
    mastered: childWords.filter(w => w.status === 'mastered').length,
  }), [childWords]);
  
  const getStatusColor = (status: Word['status']) => {
    switch (status) {
      case 'new':
        return '#3b82f6';
      case 'learning':
        return '#f59e0b';
      case 'mastered':
        return '#22c55e';
    }
  };
  
  const getStatusLabel = (status: Word['status']) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'learning':
        return 'Learning';
      case 'mastered':
        return 'Mastered';
    }
  };
  
  const renderWordItem = ({ item }: { item: Word }) => (
    <View style={[styles.wordCard, { backgroundColor: colors.surface }]}>
      <View style={styles.wordHeader}>
        <Text style={[styles.wordText, { color: colors.onSurface }]}>{item.word}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.wordStats}>
        <Text style={[styles.statText, { color: colors.onSurfaceVariant }]}>
          Seen {item.sessionsSeenCount} time{item.sessionsSeenCount !== 1 ? 's' : ''}
        </Text>
        <Text style={[styles.statText, { color: colors.onSurfaceVariant }]}>
          {item.masteryCorrectCount} correct
        </Text>
      </View>
      
      {item.status === 'mastered' && (
        <View style={styles.masteredIndicator}>
          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          <Text style={[styles.masteredText, { color: '#22c55e' }]}>Mastered</Text>
        </View>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Word Library</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.onSurface }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.new}</Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>New</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.learning}</Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Learning</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.mastered}</Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Mastered</Text>
        </View>
      </View>
      
      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {(['all', 'new', 'learning', 'mastered'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              { 
                backgroundColor: filter === f ? colors.primary : colors.surface,
              }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterTabText,
              { color: filter === f ? colors.onPrimary : colors.onSurface }
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            <Text style={[styles.filterCount, { color: filter === f ? 'rgba(255,255,255,0.7)' : colors.onSurfaceVariant }]}>
              ({stats[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Words List */}
      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.id}
        renderItem={renderWordItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={64} color={colors.onSurfaceVariant} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No words found</Text>
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Upload a book or add words to get started.
            </Text>
          </View>
        }
      />
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  wordCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordText: {
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  wordStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 13,
  },
  masteredIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  masteredText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});