import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, Pressable, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, interpolate, FlipInYRight, FlipOutYLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes } from '../../src/context/NotesContext';
import { Colors } from '../../src/constants/colors';
import { generateId } from '../../src/utils/noteUtils';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
  difficulty: 'easy' | 'medium' | 'hard';
  nextReview: string;
  reviewCount: number;
  mastered: boolean;
}

interface Deck {
  id: string;
  name: string;
  color: string;
  emoji: string;
  cardCount: number;
  masteredCount: number;
}

const DECK_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
const DECK_EMOJIS = ['🧠', '📚', '🎯', '🔬', '💡', '🌍', '⚗️', '🎨', '💻', '🎵'];

const SAMPLE_DECKS: Deck[] = [
  { id: 'd1', name: 'General Knowledge', color: '#6366f1', emoji: '🧠', cardCount: 12, masteredCount: 5 },
  { id: 'd2', name: 'Science', color: '#10b981', emoji: '🔬', cardCount: 8, masteredCount: 3 },
  { id: 'd3', name: 'History', color: '#f59e0b', emoji: '🌍', cardCount: 10, masteredCount: 7 },
];

const SAMPLE_CARDS: Flashcard[] = [
  { id: 'c1', front: 'What is photosynthesis?', back: 'The process by which plants convert sunlight, water, and CO₂ into glucose and oxygen using chlorophyll.', deck: 'd2', difficulty: 'medium', nextReview: new Date().toISOString(), reviewCount: 3, mastered: false },
  { id: 'c2', front: 'Who wrote "Romeo and Juliet"?', back: 'William Shakespeare, written around 1594–1596.', deck: 'd1', difficulty: 'easy', nextReview: new Date().toISOString(), reviewCount: 5, mastered: true },
  { id: 'c3', front: 'What year did World War II end?', back: '1945. Germany surrendered on May 8 (V-E Day) and Japan on September 2 (V-J Day).', deck: 'd3', difficulty: 'easy', nextReview: new Date().toISOString(), reviewCount: 4, mastered: false },
  { id: 'c4', front: "What is Newton's Second Law?", back: 'Force = Mass × Acceleration (F = ma). The acceleration of an object depends on the net force and its mass.', deck: 'd2', difficulty: 'hard', nextReview: new Date().toISOString(), reviewCount: 1, mastered: false },
  { id: 'c5', front: 'What is the Pythagorean theorem?', back: 'In a right triangle: a² + b² = c², where c is the hypotenuse.', deck: 'd1', difficulty: 'medium', nextReview: new Date().toISOString(), reviewCount: 6, mastered: true },
];

type StudyTab = 'decks' | 'review' | 'stats' | 'create';

export default function StudyScreen() {
  const { colors, isDark } = useTheme();
  const { notes } = useNotes();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<StudyTab>('decks');
  const [decks, setDecks] = useState<Deck[]>(SAMPLE_DECKS);
  const [cards, setCards] = useState<Flashcard[]>(SAMPLE_CARDS);
  const [reviewDeck, setReviewDeck] = useState<string | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ easy: number; medium: number; hard: number }>({ easy: 0, medium: 0, hard: 0 });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckColor, setNewDeckColor] = useState(DECK_COLORS[0]);
  const [newDeckEmoji, setNewDeckEmoji] = useState(DECK_EMOJIS[0]);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardDeck, setNewCardDeck] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const s = styles(colors);

  const flipValue = useSharedValue(0);

  const reviewCards = useMemo(() => {
    if (!reviewDeck) return [];
    return cards.filter(c => c.deck === reviewDeck);
  }, [cards, reviewDeck]);

  const currentCard = reviewCards[currentCardIdx];

  const totalMastered = cards.filter(c => c.mastered).length;
  const totalCards = cards.length;
  const streakDays = 7;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    flipValue.value = withSpring(isFlipped ? 0 : 1, { damping: 15, stiffness: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    Haptics.impactAsync(difficulty === 'easy' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    setSessionResults(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1 }));
    setIsFlipped(false);
    flipValue.value = 0;
    if (currentCardIdx < reviewCards.length - 1) {
      setCurrentCardIdx(prev => prev + 1);
    } else {
      setSessionComplete(true);
    }
  };

  const startReview = (deckId: string) => {
    setReviewDeck(deckId);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSessionResults({ easy: 0, medium: 0, hard: 0 });
    setActiveTab('review');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const endReview = () => {
    setReviewDeck(null);
    setActiveTab('decks');
    setSessionComplete(false);
  };

  const createDeck = () => {
    if (!newDeckName.trim()) return;
    const newDeck: Deck = {
      id: generateId(),
      name: newDeckName.trim(),
      color: newDeckColor,
      emoji: newDeckEmoji,
      cardCount: 0,
      masteredCount: 0,
    };
    setDecks(prev => [...prev, newDeck]);
    setNewDeckName('');
    setShowCreateDeck(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const createCard = () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !newCardDeck) return;
    const newCard: Flashcard = {
      id: generateId(),
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      deck: newCardDeck,
      difficulty: 'medium',
      nextReview: new Date().toISOString(),
      reviewCount: 0,
      mastered: false,
    };
    setCards(prev => [...prev, newCard]);
    setDecks(prev => prev.map(d => d.id === newCardDeck ? { ...d, cardCount: d.cardCount + 1 } : d));
    setNewCardFront('');
    setNewCardBack('');
    setShowCreateCard(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cardFrontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [0, 180])}deg` }],
  }));

  const cardBackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [180, 360])}deg` }],
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  }));

  const TABS: { id: StudyTab; label: string; icon: string }[] = [
    { id: 'decks', label: 'Decks', icon: 'cards-outline' },
    { id: 'stats', label: 'Stats', icon: 'chart-bar' },
    { id: 'create', label: 'Create', icon: 'plus-circle-outline' },
  ];

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>Study</Text>
        <View style={s.headerRight}>
          <View style={s.streakBadge}>
            <Text style={s.streakEmoji}>🔥</Text>
            <Text style={s.streakText}>{streakDays} day streak</Text>
          </View>
        </View>
      </View>

      {activeTab !== 'review' && (
        <View style={s.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[s.tabBtn, activeTab === tab.id && s.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.id ? colors.primary : colors.textMuted}
              />
              <Text style={[s.tabLabel, activeTab === tab.id && { color: colors.primary }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'decks' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[s.statNum, { color: colors.primary }]}>{totalCards}</Text>
              <Text style={[s.statLabel, { color: colors.primary }]}>Total Cards</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: '#10b981' + '22' }]}>
              <Text style={[s.statNum, { color: '#10b981' }]}>{totalMastered}</Text>
              <Text style={[s.statLabel, { color: '#10b981' }]}>Mastered</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: '#f59e0b' + '22' }]}>
              <Text style={[s.statNum, { color: '#f59e0b' }]}>{decks.length}</Text>
              <Text style={[s.statLabel, { color: '#f59e0b' }]}>Decks</Text>
            </View>
          </View>

          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Your Decks</Text>
            <TouchableOpacity onPress={() => setShowCreateDeck(true)}>
              <Text style={[s.sectionAction, { color: colors.primary }]}>+ New Deck</Text>
            </TouchableOpacity>
          </View>

          {decks.map((deck, i) => {
            const deckCards = cards.filter(c => c.deck === deck.id);
            const mastered = deckCards.filter(c => c.mastered).length;
            const progress = deckCards.length > 0 ? mastered / deckCards.length : 0;
            return (
              <Animated.View key={deck.id} entering={FadeInDown.delay(i * 60).springify()}>
                <TouchableOpacity style={[s.deckCard, { borderLeftColor: deck.color, borderLeftWidth: 4 }]}>
                  <View style={s.deckCardLeft}>
                    <Text style={s.deckEmoji}>{deck.emoji}</Text>
                    <View>
                      <Text style={[s.deckName, { color: colors.text }]}>{deck.name}</Text>
                      <Text style={[s.deckMeta, { color: colors.textSecondary }]}>
                        {deckCards.length} cards · {mastered} mastered
                      </Text>
                      <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: deck.color }]} />
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[s.studyBtn, { backgroundColor: deck.color }]}
                    onPress={() => startReview(deck.id)}
                  >
                    <MaterialCommunityIcons name="play" size={16} color="#fff" />
                    <Text style={s.studyBtnText}>Study</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>From Your Notes</Text>
          </View>
          <View style={s.aiCard}>
            <MaterialCommunityIcons name="auto-fix" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.aiCardTitle, { color: colors.text }]}>AI Flashcard Generator</Text>
              <Text style={[s.aiCardSub, { color: colors.textSecondary }]}>
                Generate flashcards automatically from {notes.filter(n => !n.isTrashed).length} notes
              </Text>
            </View>
            <TouchableOpacity style={[s.aiBtn, { backgroundColor: colors.primary }]}
              onPress={() => Alert.alert('AI Flashcards', 'AI-powered flashcard generation from your notes is coming soon! This will analyze your note content and create study cards automatically.')}>
              <Text style={s.aiBtnText}>Generate</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === 'review' && reviewDeck && (
        <View style={s.reviewScreen}>
          {sessionComplete ? (
            <Animated.View entering={FadeIn} style={s.sessionComplete}>
              <Text style={s.sessionCompleteEmoji}>🎉</Text>
              <Text style={[s.sessionCompleteTitle, { color: colors.text }]}>Session Complete!</Text>
              <Text style={[s.sessionCompleteSub, { color: colors.textSecondary }]}>
                You reviewed {reviewCards.length} cards
              </Text>
              <View style={s.sessionStats}>
                <View style={[s.sessionStat, { backgroundColor: '#10b981' + '22' }]}>
                  <Text style={[s.sessionStatNum, { color: '#10b981' }]}>{sessionResults.easy}</Text>
                  <Text style={[s.sessionStatLabel, { color: '#10b981' }]}>Easy</Text>
                </View>
                <View style={[s.sessionStat, { backgroundColor: '#f59e0b' + '22' }]}>
                  <Text style={[s.sessionStatNum, { color: '#f59e0b' }]}>{sessionResults.medium}</Text>
                  <Text style={[s.sessionStatLabel, { color: '#f59e0b' }]}>Medium</Text>
                </View>
                <View style={[s.sessionStat, { backgroundColor: '#ef4444' + '22' }]}>
                  <Text style={[s.sessionStatNum, { color: '#ef4444' }]}>{sessionResults.hard}</Text>
                  <Text style={[s.sessionStatLabel, { color: '#ef4444' }]}>Hard</Text>
                </View>
              </View>
              <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} onPress={endReview}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setCurrentCardIdx(0); setSessionComplete(false); setSessionResults({ easy: 0, medium: 0, hard: 0 }); }}>
                <Text style={[s.reviewAgainText, { color: colors.primary }]}>Review Again</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <>
              <View style={s.reviewHeader}>
                <TouchableOpacity onPress={endReview} style={s.backBtn}>
                  <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[s.reviewProgress, { color: colors.textSecondary }]}>
                  {currentCardIdx + 1} / {reviewCards.length}
                </Text>
                <View style={s.reviewProgressBar}>
                  <View style={[s.reviewProgressFill, { width: `${((currentCardIdx + 1) / reviewCards.length) * 100}%` as any, backgroundColor: colors.primary }]} />
                </View>
              </View>

              <TouchableOpacity style={s.cardContainer} onPress={handleFlip} activeOpacity={0.9}>
                <Animated.View style={[s.flashcard, s.flashcardFront, cardFrontStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.cardHeader}>
                    <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.primary} />
                    <Text style={[s.cardSide, { color: colors.primary }]}>QUESTION</Text>
                  </View>
                  <Text style={[s.cardText, { color: colors.text }]}>{currentCard?.front}</Text>
                  <View style={s.tapHint}>
                    <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.textMuted} />
                    <Text style={[s.tapHintText, { color: colors.textMuted }]}>Tap to reveal answer</Text>
                  </View>
                </Animated.View>

                <Animated.View style={[s.flashcard, s.flashcardBack, cardBackStyle, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                  <View style={s.cardHeader}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.primary} />
                    <Text style={[s.cardSide, { color: colors.primary }]}>ANSWER</Text>
                  </View>
                  <Text style={[s.cardText, { color: colors.text }]}>{currentCard?.back}</Text>
                </Animated.View>
              </TouchableOpacity>

              {isFlipped && (
                <Animated.View entering={FadeInDown} style={s.ratingRow}>
                  <Text style={[s.ratingLabel, { color: colors.textSecondary }]}>How well did you know this?</Text>
                  <View style={s.ratingBtns}>
                    <TouchableOpacity style={[s.ratingBtn, { backgroundColor: '#ef4444' + '22', borderColor: '#ef4444' }]} onPress={() => handleDifficulty('hard')}>
                      <Text style={{ fontSize: 20 }}>😟</Text>
                      <Text style={[s.ratingText, { color: '#ef4444' }]}>Hard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.ratingBtn, { backgroundColor: '#f59e0b' + '22', borderColor: '#f59e0b' }]} onPress={() => handleDifficulty('medium')}>
                      <Text style={{ fontSize: 20 }}>🤔</Text>
                      <Text style={[s.ratingText, { color: '#f59e0b' }]}>Medium</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.ratingBtn, { backgroundColor: '#10b981' + '22', borderColor: '#10b981' }]} onPress={() => handleDifficulty('easy')}>
                      <Text style={{ fontSize: 20 }}>😊</Text>
                      <Text style={[s.ratingText, { color: '#10b981' }]}>Easy</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </>
          )}
        </View>
      )}

      {activeTab === 'stats' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          <View style={s.statsBig}>
            <View style={[s.statsBigCard, { backgroundColor: colors.primary }]}>
              <Text style={s.statsBigNum}>{streakDays}</Text>
              <Text style={s.statsBigLabel}>Day Streak 🔥</Text>
            </View>
          </View>

          <View style={s.statsGrid}>
            {[
              { label: 'Total Reviewed', value: '47', icon: 'cards', color: '#6366f1' },
              { label: 'Mastered', value: String(totalMastered), icon: 'star-circle', color: '#10b981' },
              { label: 'Accuracy', value: '78%', icon: 'target', color: '#3b82f6' },
              { label: 'Study Time', value: '2.4h', icon: 'clock-outline', color: '#f59e0b' },
              { label: 'Cards Due', value: String(cards.filter(c => !c.mastered).length), icon: 'calendar-clock', color: '#ef4444' },
              { label: 'Sessions', value: '12', icon: 'chart-line', color: '#8b5cf6' },
            ].map((stat, i) => (
              <Animated.View key={stat.label} entering={FadeInDown.delay(i * 50).springify()} style={[s.statsCard, { backgroundColor: stat.color + '18' }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={24} color={stat.color} />
                <Text style={[s.statsCardNum, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.statsCardLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Weekly Activity</Text>
          </View>
          <View style={[s.activityCard, { backgroundColor: colors.surface }]}>
            <View style={s.weekRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const heights = [40, 65, 30, 80, 55, 20, 45];
                const isToday = i === 4;
                return (
                  <View key={i} style={s.dayCol}>
                    <View style={s.barContainer}>
                      <View style={[s.bar, { height: heights[i], backgroundColor: isToday ? colors.primary : colors.primary + '44' }]} />
                    </View>
                    <Text style={[s.dayLabel, isToday && { color: colors.primary, fontWeight: '700' }]}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === 'create' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          <View style={s.createOptions}>
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <TouchableOpacity style={[s.createCard, { backgroundColor: colors.surface }]} onPress={() => setShowCreateDeck(true)}>
                <View style={[s.createIcon, { backgroundColor: colors.primary + '22' }]}>
                  <MaterialCommunityIcons name="cards-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[s.createCardTitle, { color: colors.text }]}>New Deck</Text>
                <Text style={[s.createCardSub, { color: colors.textSecondary }]}>Create a new flashcard deck</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <TouchableOpacity
                style={[s.createCard, { backgroundColor: colors.surface }]}
                onPress={() => { if (decks.length === 0) { Alert.alert('No Decks', 'Create a deck first.'); return; } setNewCardDeck(decks[0].id); setShowCreateCard(true); }}
              >
                <View style={[s.createIcon, { backgroundColor: '#10b981' + '22' }]}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={32} color="#10b981" />
                </View>
                <Text style={[s.createCardTitle, { color: colors.text }]}>New Card</Text>
                <Text style={[s.createCardSub, { color: colors.textSecondary }]}>Add a flashcard to a deck</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <TouchableOpacity style={[s.createCard, { backgroundColor: colors.surface }]}
                onPress={() => Alert.alert('AI Generator', 'Generate flashcards from your notes automatically using AI. Coming soon!')}>
                <View style={[s.createIcon, { backgroundColor: '#f59e0b' + '22' }]}>
                  <MaterialCommunityIcons name="auto-fix" size={32} color="#f59e0b" />
                </View>
                <Text style={[s.createCardTitle, { color: colors.text }]}>AI Generate</Text>
                <Text style={[s.createCardSub, { color: colors.textSecondary }]}>Auto-create cards from notes</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).springify()}>
              <TouchableOpacity style={[s.createCard, { backgroundColor: colors.surface }]}
                onPress={() => Alert.alert('Import', 'Import flashcards from Anki, Quizlet, CSV, and more. Coming soon!')}>
                <View style={[s.createIcon, { backgroundColor: '#3b82f6' + '22' }]}>
                  <MaterialCommunityIcons name="import" size={32} color="#3b82f6" />
                </View>
                <Text style={[s.createCardTitle, { color: colors.text }]}>Import Cards</Text>
                <Text style={[s.createCardSub, { color: colors.textSecondary }]}>Import from Anki, Quizlet, CSV</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={showCreateDeck} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowCreateDeck(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>New Deck</Text>
            <Text style={s.inputLabel}>Deck Name</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={newDeckName}
              onChangeText={setNewDeckName}
              placeholder="e.g. Biology Chapter 5"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Text style={s.inputLabel}>Color</Text>
            <View style={s.colorRow}>
              {DECK_COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, newDeckColor === c && s.colorDotActive]} onPress={() => setNewDeckColor(c)} />
              ))}
            </View>
            <Text style={s.inputLabel}>Emoji</Text>
            <View style={s.emojiRow}>
              {DECK_EMOJIS.map(e => (
                <TouchableOpacity key={e} style={[s.emojiBtn, newDeckEmoji === e && { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary }]} onPress={() => setNewDeckEmoji(e)}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: colors.inputBg }]} onPress={() => setShowCreateDeck(false)}>
                <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: newDeckColor }]} onPress={createDeck}>
                <Text style={s.confirmBtnText}>Create Deck</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCreateCard} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowCreateCard(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>New Flashcard</Text>
            <Text style={s.inputLabel}>Deck</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {decks.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[s.deckPill, { borderColor: d.color }, newCardDeck === d.id && { backgroundColor: d.color + '22' }]}
                  onPress={() => setNewCardDeck(d.id)}
                >
                  <Text style={{ fontSize: 14 }}>{d.emoji}</Text>
                  <Text style={[s.deckPillText, { color: newCardDeck === d.id ? d.color : colors.textSecondary }]}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.inputLabel}>Question (Front)</Text>
            <TextInput
              style={[s.input, s.inputMulti, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={newCardFront}
              onChangeText={setNewCardFront}
              placeholder="Enter the question..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Text style={s.inputLabel}>Answer (Back)</Text>
            <TextInput
              style={[s.input, s.inputMulti, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={newCardBack}
              onChangeText={setNewCardBack}
              placeholder="Enter the answer..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: colors.inputBg }]} onPress={() => setShowCreateCard(false)}>
                <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: colors.primary }]} onPress={createCard}>
                <Text style={s.confirmBtnText}>Add Card</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: Colors.font.xxxl, fontWeight: '800', color: colors.text, flex: 1 },
  headerRight: {},
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Colors.radius.full },
  streakEmoji: { fontSize: 16 },
  streakText: { fontSize: Colors.font.sm, fontWeight: '700', color: '#f59e0b' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Colors.radius.lg, backgroundColor: colors.inputBg },
  tabBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  tabLabel: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textMuted },
  list: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: Colors.radius.lg, padding: 14, alignItems: 'center' },
  statNum: { fontSize: Colors.font.xxl, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: Colors.font.base, fontWeight: '800', color: colors.text },
  sectionAction: { fontSize: Colors.font.sm, fontWeight: '600' },
  deckCard: {
    backgroundColor: colors.surface, borderRadius: Colors.radius.xl,
    padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
  },
  deckCardLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  deckEmoji: { fontSize: 32 },
  deckName: { fontSize: Colors.font.base, fontWeight: '700', marginBottom: 2 },
  deckMeta: { fontSize: Colors.font.sm, marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, width: 120, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  studyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Colors.radius.full },
  studyBtnText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.sm },
  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primarySoft, borderRadius: Colors.radius.xl,
    padding: 16, marginTop: 4, borderWidth: 1, borderColor: colors.primary + '44',
  },
  aiCardTitle: { fontSize: Colors.font.base, fontWeight: '700', marginBottom: 2 },
  aiCardSub: { fontSize: Colors.font.sm },
  aiBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Colors.radius.full },
  aiBtnText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.sm },
  reviewScreen: { flex: 1, padding: 20 },
  reviewHeader: { marginBottom: 24 },
  backBtn: { marginBottom: 12 },
  reviewProgress: { fontSize: Colors.font.sm, marginBottom: 8, textAlign: 'center', fontWeight: '600' },
  reviewProgressBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  reviewProgressFill: { height: 6, borderRadius: 3 },
  cardContainer: { flex: 1, position: 'relative', marginBottom: 20 },
  flashcard: {
    flex: 1, borderRadius: 24, padding: 28,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20,
    elevation: 8,
  },
  flashcardFront: {},
  flashcardBack: {},
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  cardSide: { fontSize: Colors.font.sm, fontWeight: '800', letterSpacing: 1 },
  cardText: { fontSize: Colors.font.xl, fontWeight: '500', textAlign: 'center', lineHeight: 30 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'absolute', bottom: 16 },
  tapHintText: { fontSize: Colors.font.sm },
  ratingRow: { gap: 10 },
  ratingLabel: { fontSize: Colors.font.sm, textAlign: 'center', fontWeight: '500', marginBottom: 4 },
  ratingBtns: { flexDirection: 'row', gap: 10 },
  ratingBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: 1.5, gap: 6 },
  ratingText: { fontSize: Colors.font.base, fontWeight: '700' },
  sessionComplete: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  sessionCompleteEmoji: { fontSize: 64 },
  sessionCompleteTitle: { fontSize: Colors.font.xxl, fontWeight: '800' },
  sessionCompleteSub: { fontSize: Colors.font.base, marginBottom: 8 },
  sessionStats: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  sessionStat: { width: 90, padding: 16, borderRadius: 20, alignItems: 'center', gap: 4 },
  sessionStatNum: { fontSize: Colors.font.xxl, fontWeight: '800' },
  sessionStatLabel: { fontSize: Colors.font.sm, fontWeight: '600' },
  doneBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: Colors.radius.full, marginBottom: 8 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.base },
  reviewAgainText: { fontSize: Colors.font.base, fontWeight: '600' },
  statsBig: { marginBottom: 16 },
  statsBigCard: { borderRadius: Colors.radius.xl, padding: 28, alignItems: 'center', gap: 6 },
  statsBigNum: { fontSize: 56, fontWeight: '900', color: '#fff' },
  statsBigLabel: { fontSize: Colors.font.lg, fontWeight: '700', color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statsCard: { width: '47%', padding: 16, borderRadius: Colors.radius.xl, gap: 6 },
  statsCardNum: { fontSize: Colors.font.xxl, fontWeight: '800' },
  statsCardLabel: { fontSize: Colors.font.sm, fontWeight: '500' },
  activityCard: { borderRadius: Colors.radius.xl, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dayCol: { alignItems: 'center', gap: 8 },
  barContainer: { height: 80, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 6 },
  dayLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  createOptions: { gap: 12 },
  createCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: Colors.radius.xl, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
  },
  createIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  createCardTitle: { flex: 1, fontSize: Colors.font.base, fontWeight: '700' },
  createCardSub: { flex: 1, fontSize: Colors.font.sm, marginTop: -12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: Colors.font.xl, fontWeight: '800', marginBottom: 16 },
  inputLabel: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  input: { borderRadius: Colors.radius.md, padding: 14, fontSize: Colors.font.base, borderWidth: 1 },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: colors.text },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Colors.radius.lg, alignItems: 'center' },
  cancelBtnText: { fontWeight: '600', fontSize: Colors.font.base },
  confirmBtn: { flex: 2, padding: 14, borderRadius: Colors.radius.lg, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.base },
  deckPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Colors.radius.full, borderWidth: 1.5, marginRight: 8, backgroundColor: colors.inputBg },
  deckPillText: { fontSize: Colors.font.sm, fontWeight: '600' },
});
