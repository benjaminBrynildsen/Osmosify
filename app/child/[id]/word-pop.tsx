import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { speakWord } from '../../../lib/speech';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_HEIGHT = SCREEN_HEIGHT - 250;

interface Bubble {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  size: number;
}

export default function WordPopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  const childWords = useMemo(() => 
    words.filter(w => w.childId === id).map(w => w.word),
    [words, id]
  );
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [roundsInLevel, setRoundsInLevel] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'levelup' | null>(null);
  const [wordsPlayed, setWordsPlayed] = useState(0);
  
  const animationRef = useRef<number>();
  const bubbleIdRef = useRef(0);
  const gameAreaRef = useRef<View>(null);
  
  const ROUNDS_PER_LEVEL = 5;
  
  const playableWords = useMemo(() => {
    return childWords.filter(w => w.length >= 2 && w.length <= 12);
  }, [childWords]);
  
  const getRandomWords = useCallback((count: number, mustInclude: string): string[] => {
    const available = playableWords.filter(w => w !== mustInclude);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count - 1);
    selected.push(mustInclude);
    return selected.sort(() => Math.random() - 0.5);
  }, [playableWords]);
  
  const calculateSpeed = useCallback((lvl: number, round: number) => {
    const completedLevelsBonus = 0.1 * ROUNDS_PER_LEVEL * (lvl - 1) * lvl / 2;
    const currentRoundBonus = round * lvl * 0.1;
    return 1.3 + completedLevelsBonus + currentRoundBonus;
  }, []);
  
  const spawnBubbles = useCallback((target: string, currentLevel: number, roundNum?: number) => {
    const bubbleCount = Math.min(4, playableWords.length);
    const selectedWords = getRandomWords(bubbleCount, target);
    
    const round = roundNum ?? 0;
    const baseSpeed = calculateSpeed(currentLevel, round);
    const speedVariation = 0.3;
    
    const sectionWidth = SCREEN_WIDTH / bubbleCount;
    
    const newBubbles: Bubble[] = selectedWords.map((word, index) => {
      const size = 80 + word.length * 4;
      const x = sectionWidth * index + (sectionWidth - size) / 2 + (Math.random() * 20 - 10);
      
      return {
        id: bubbleIdRef.current++,
        word,
        x: Math.max(10, Math.min(SCREEN_WIDTH - size - 10, x)),
        y: GAME_HEIGHT + 50,
        speed: baseSpeed + Math.random() * speedVariation,
        size,
      };
    });
    
    setBubbles(newBubbles);
  }, [playableWords, getRandomWords, calculateSpeed]);
  
  const nextRound = useCallback((currentLevel?: number, currentRound?: number) => {
    if (playableWords.length < 2) return;
    
    const lvl = currentLevel ?? level;
    const round = currentRound ?? roundsInLevel;
    
    const randomIndex = Math.floor(Math.random() * playableWords.length);
    const target = playableWords[randomIndex];
    
    setTargetWord(target);
    setWordsPlayed(prev => prev + 1);
    spawnBubbles(target, lvl, round);
    
    setTimeout(() => {
      speakWord(target, child?.voicePreference);
    }, 500);
  }, [playableWords, spawnBubbles, level, roundsInLevel, child?.voicePreference]);
  
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setStreak(0);
    setLives(3);
    setLevel(1);
    setRoundsInLevel(0);
    setWordsPlayed(0);
    setFeedback(null);
    nextRound(1, 0);
  }, [nextRound]);
  
  const handleBubbleTap = useCallback((bubble: Bubble) => {
    if (gameState !== 'playing') return;
    
    if (bubble.word === targetWord) {
      setBubbles([]);
      const levelBonus = level * 5;
      const points = 10 + streak * 2 + levelBonus;
      setScore(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(best => Math.max(best, newStreak));
        return newStreak;
      });
      setFeedback('correct');
      
      setRoundsInLevel(prev => {
        const newRounds = prev + 1;
        if (newRounds >= ROUNDS_PER_LEVEL) {
          setLevel(lvl => {
            const newLevel = lvl + 1;
            setLives(currentLives => Math.min(currentLives + 1, 3));
            setTimeout(() => {
              setFeedback('levelup');
              speakWord(`Level ${newLevel}!`, child?.voicePreference);
            }, 500);
            setTimeout(() => {
              setFeedback(null);
              nextRound(newLevel, 0);
            }, 2000);
            return newLevel;
          });
          return 0;
        } else {
          setTimeout(() => {
            setFeedback(null);
            nextRound(undefined, newRounds);
          }, 1500);
          return newRounds;
        }
      });
    } else {
      setStreak(0);
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameover');
        }
        return newLives;
      });
      setFeedback('wrong');
      
      setTimeout(() => {
        setFeedback(null);
      }, 500);
    }
  }, [gameState, targetWord, level, streak, nextRound, child?.voicePreference]);
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const animate = () => {
      setBubbles(prev => {
        const updated = prev.map(bubble => ({
          ...bubble,
          y: bubble.y - bubble.speed,
        }));
        
        const escaped = updated.some(b => b.y < -100 && b.word === targetWord);
        if (escaped) {
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('gameover');
            } else {
              setTimeout(nextRound, 500);
            }
            return newLives;
          });
          setStreak(0);
          return [];
        }
        
        return updated.filter(b => b.y > -150);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, targetWord, nextRound]);
  
  if (playableWords.length < 4) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Word Pop</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="game-controller-outline" size={64} color={colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Not Enough Words</Text>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Add at least 4 words to {child?.name}'s library to play Word Pop!
          </Text>
          <TouchableOpacity 
            style={[styles.goBackButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.goBackText, { color: colors.onPrimary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        
        <View style={styles.statsContainer}>
          <View style={[styles.statBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statText, { color: colors.onSurface }]}>Lv.{level}</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statText, { color: colors.onSurface }]}>
              {calculateSpeed(level, roundsInLevel).toFixed(1)}x
            </Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary, marginLeft: 4 }]}>{score}</Text>
          </View>
          {streak > 1 && (
            <View style={[styles.streakBadge, { backgroundColor: '#f97316' }]}>
              <Ionicons name="flame" size={12} color="white" />
              <Text style={[styles.streakText, { color: 'white' }]}>{streak}x</Text>
            </View>
          )}
        </View>
        
        <View style={styles.livesContainer}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={[styles.heart, { color: i < lives ? '#ef4444' : colors.surfaceVariant }]}>
              ♥
            </Text>
          ))}
        </View>
      </View>
      
      {/* Target Word Display */}
      {gameState === 'playing' && targetWord && (
        <View style={[styles.targetContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.targetLabel, { color: colors.onSurfaceVariant }]}>
            Listen and tap the word:
          </Text>
          <View style={styles.targetRow}>
            <Text style={[styles.targetWord, { color: colors.onSurface }]}>
              {targetWord}
            </Text>
            <TouchableOpacity 
              style={styles.speakButton}
              onPress={() => speakWord(targetWord, child?.voicePreference)}
            >
              <Ionicons name="volume-high" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Game Area */}
      <View 
        ref={gameAreaRef}
        style={styles.gameArea}
      >
        {/* Feedback Overlays */}
        {feedback === 'correct' && (
          <View style={[styles.feedbackOverlay, { backgroundColor: 'rgba(34, 197, 94, 0.9)' }]}>
            <View style={styles.starsContainer}>
              {[...Array(12)].map((_, i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={24}
                  color="#fef08a"
                  style={[
                    styles.feedbackStar,
                    {
                      left: `${10 + (i % 4) * 25}%`,
                      top: `${10 + Math.floor(i / 4) * 30}%`,
                    }
                  ]}
                />
              ))}
            </View>
            <Text style={styles.feedbackWord}>{targetWord}</Text>
          </View>
        )}
        
        {feedback === 'levelup' && (
          <View style={[styles.feedbackOverlay, { backgroundColor: 'rgba(147, 51, 234, 0.9)' }]}>
            <Text style={styles.levelText}>Level {level}!</Text>
          </View>
        )}
        
        {/* Ready Screen */}
        {gameState === 'ready' && (
          <View style={styles.readyScreen}>
            <Ionicons name="trophy" size={80} color={colors.primary} />
            <Text style={[styles.readyTitle, { color: colors.onSurface }]}>Word Pop</Text>
            <Text style={[styles.readyDescription, { color: colors.onSurfaceVariant }]}>
              Listen to the word and tap the matching bubble before it floats away!
            </Text>
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={startGame}
            >
              <Ionicons name="play" size={24} color={colors.onPrimary} />
              <Text style={[styles.startButtonText, { color: colors.onPrimary }]}>Start Game</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <View style={[styles.gameOverScreen, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <Ionicons name="trophy" size={64} color="#fbbf24" />
            <Text style={styles.gameOverTitle}>Game Over!</Text>
            
            <View style={styles.finalStats}>
              <View style={styles.finalStat}>
                <Text style={styles.finalStatValue}>{score}</Text>
                <Text style={styles.finalStatLabel}>Points</Text>
              </View>
              <View style={styles.finalStat}>
                <Text style={styles.finalStatValue}>{level}</Text>
                <Text style={styles.finalStatLabel}>Level</Text>
              </View>
              <View style={styles.finalStat}>
                <Text style={styles.finalStatValue}>{bestStreak}</Text>
                <Text style={styles.finalStatLabel}>Best Streak</Text>
              </View>
              <View style={styles.finalStat}>
                <Text style={styles.finalStatValue}>{wordsPlayed}</Text>
                <Text style={styles.finalStatLabel}>Words</Text>
              </View>
            </View>
            
            <View style={styles.gameOverButtons}>
              <TouchableOpacity 
                style={[styles.exitButton, { borderColor: colors.outline }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.exitButtonText, { color: colors.onSurface }]}>Exit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.playAgainButton, { backgroundColor: colors.primary }]}
                onPress={startGame}
              >
                <Ionicons name="refresh" size={20} color={colors.onPrimary} />
                <Text style={[styles.playAgainText, { color: colors.onPrimary }]}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Bubbles */}
        {gameState === 'playing' && bubbles.map(bubble => (
          <TouchableOpacity
            key={bubble.id}
            style={[
              styles.bubble,
              {
                left: bubble.x,
                top: bubble.y,
                width: bubble.size,
                height: bubble.size,
                backgroundColor: colors.primary,
                borderRadius: bubble.size / 2,
              }
            ]}
            onPress={() => handleBubbleTap(bubble)}
            activeOpacity={0.8}
          >
            <Text style={[styles.bubbleText, { fontSize: Math.max(14, 18 - bubble.word.length / 2) }]}>
              {bubble.word}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
    padding: 12,
    paddingTop: 8,
    gap: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
  },
  livesContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  heart: {
    fontSize: 24,
  },
  targetContainer: {
    padding: 16,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetWord: {
    fontSize: 28,
    fontWeight: '700',
  },
  speakButton: {
    padding: 8,
  },
  gameArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  feedbackStar: {
    position: 'absolute',
  },
  feedbackWord: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
    zIndex: 11,
  },
  levelText: {
    fontSize: 40,
    fontWeight: '700',
    color: 'white',
  },
  readyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  readyTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
  },
  readyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  gameOverScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 20,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
    marginBottom: 24,
  },
  finalStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  finalStat: {
    alignItems: 'center',
  },
  finalStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  finalStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  exitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bubble: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleText: {
    color: 'white',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  goBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goBackText: {
    fontSize: 16,
    fontWeight: '600',
  },
});