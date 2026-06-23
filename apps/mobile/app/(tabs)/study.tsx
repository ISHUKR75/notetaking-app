import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Platform, Modal, Pressable, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, interpolate, withSequence,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/context/ThemeContext';
import { Colors, ThemeColors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Flashcard {
  id: string; front: string; back: string; deckId: string;
  hint?: string;
  difficulty: 'easy' | 'good' | 'hard' | 'again';
  interval: number; easeFactor: number; nextReview: string;
  reviewCount: number; mastered: boolean; tags: string[];
}

interface Deck {
  id: string; name: string; color: string; emoji: string;
  description: string; cardCount: number; masteredCount: number;
  createdAt: string; streak: number;
}

type StudyTab = 'decks' | 'review' | 'stats' | 'pomodoro';
type PomodoroMode = 'focus' | 'short' | 'long';
type QuizMode = 'flashcard' | 'multiChoice';

const STORAGE_KEY_DECKS = '@ishu_study_decks';
const STORAGE_KEY_CARDS = '@ishu_study_cards';
const STORAGE_KEY_POMO_TOTAL = '@ishu_pomo_total';

const DECK_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];
const DECK_EMOJIS = ['🧠','📚','🎯','🔬','💡','🌍','⚗️','🎨','💻','🎵','📊','🏛️','🌿','🚀','⭐','🦋','🔭','📐','🎻','🌺'];

const DEFAULT_DECKS: Deck[] = [
  { id:'d1', name:'General Knowledge', color:'#6366f1', emoji:'🧠', description:'Broad knowledge cards', cardCount:5, masteredCount:2, createdAt:new Date().toISOString(), streak:3 },
  { id:'d2', name:'Science',           color:'#10b981', emoji:'🔬', description:'Physics, Chemistry, Biology', cardCount:4, masteredCount:1, createdAt:new Date().toISOString(), streak:7 },
  { id:'d3', name:'History',           color:'#f59e0b', emoji:'🌍', description:'World history events', cardCount:5, masteredCount:3, createdAt:new Date().toISOString(), streak:14 },
];

const DEFAULT_CARDS: Flashcard[] = [
  { id:'c1', front:'What is photosynthesis?', back:'Plants use sunlight, water, and CO₂ to produce glucose and oxygen via chloroplasts.', deckId:'d2', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:3, mastered:false, tags:['biology'] },
  { id:'c2', front:'Who wrote Romeo and Juliet?', back:"William Shakespeare (~1594–96). One of history's most performed plays.", deckId:'d1', difficulty:'easy', interval:8, easeFactor:2.8, nextReview:new Date().toISOString(), reviewCount:6, mastered:true, tags:['literature'] },
  { id:'c3', front:'When did World War II end?', back:'1945. Germany surrendered May 8 (V-E Day). Japan surrendered Sep 2 (V-J Day).', deckId:'d3', difficulty:'easy', interval:8, easeFactor:2.7, nextReview:new Date().toISOString(), reviewCount:4, mastered:false, tags:['war'] },
  { id:'c4', front:"Newton's Second Law?", back:'F = ma. Net force equals mass times acceleration. Measured in Newtons (N).', deckId:'d2', difficulty:'hard', interval:1, easeFactor:2.0, nextReview:new Date().toISOString(), reviewCount:1, mastered:false, tags:['physics'] },
  { id:'c5', front:'Pythagorean theorem?', back:'a² + b² = c² where c is the hypotenuse of a right triangle.', deckId:'d1', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:5, mastered:true, tags:['math'] },
  { id:'c6', front:'What is DNA?', back:'Deoxyribonucleic acid. Double-helix molecule carrying genetic info, made of nucleotides (A,T,G,C).', deckId:'d2', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:2, mastered:false, tags:['biology'] },
  { id:'c7', front:'French Revolution?', back:'1789–1799. Ended monarchy, rise of Napoleon. Storming of Bastille: July 14, 1789.', deckId:'d3', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:3, mastered:true, tags:['france'] },
  { id:'c8', front:'Speed of light?', back:'~299,792,458 m/s in vacuum (c). Nothing with mass can reach this speed.', deckId:'d2', difficulty:'easy', interval:8, easeFactor:2.7, nextReview:new Date().toISOString(), reviewCount:2, mastered:false, tags:['physics'] },
  { id:'c9', front:'Who painted the Mona Lisa?', back:'Leonardo da Vinci, painted ~1503–1519. Currently in the Louvre, Paris.', deckId:'d1', difficulty:'easy', interval:10, easeFactor:2.9, nextReview:new Date().toISOString(), reviewCount:8, mastered:true, tags:['art'] },
  { id:'c10', front:'What is the Magna Carta?', back:'1215 English charter limiting royal power, a foundation of constitutional law and human rights.', deckId:'d3', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:2, mastered:false, tags:['england'] },
];

// ─── Helper components ────────────────────────────────────────────────────────

function StatBadge({ label, value, icon, color }: { label:string; value:string|number; icon:string; color:string }) {
  return (
    <View style={{ flex:1, backgroundColor:color+'18', borderRadius:16, padding:14, alignItems:'center', gap:4 }}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={{ fontSize:22, fontWeight:'900', color }}>{value}</Text>
      <Text style={{ fontSize:10, color:color+'aa', fontWeight:'700', textTransform:'uppercase', letterSpacing:0.3, textAlign:'center' }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StudyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState<StudyTab>('decks');
  const [decks, setDecks] = useState<Deck[]>(DEFAULT_DECKS);
  const [cards, setCards] = useState<Flashcard[]>(DEFAULT_CARDS);
  const [loaded, setLoaded] = useState(false);

  // Review state
  const [reviewDeckId, setReviewDeckId] = useState<string|null>(null);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionResults, setSessionResults] = useState({ easy:0, good:0, hard:0, again:0 });
  const [sessionComplete, setSessionComplete] = useState(false);

  // Create modals
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckColor, setNewDeckColor] = useState(DECK_COLORS[0]);
  const [newDeckEmoji, setNewDeckEmoji] = useState(DECK_EMOJIS[0]);
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardHint, setNewCardHint] = useState('');
  const [newCardDeck, setNewCardDeck] = useState('');
  const [newCardTag, setNewCardTag] = useState('');

  // Quiz & hint state
  const [quizMode, setQuizMode] = useState<QuizMode>('flashcard');
  const [showHint, setShowHint] = useState(false);
  const [mcChoices, setMcChoices] = useState<string[]>([]);
  const [mcSelected, setMcSelected] = useState<string | null>(null);

  // Pomodoro
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('focus');
  const [pomodoroTotal, setPomodoroTotal] = useState(0);
  const [pomodoroSession, setPomodoroSession] = useState(1);
  const pomodoroRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const flipValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const pomodoroProgress = useSharedValue(1);

  const currentCard = reviewQueue[currentIdx];
  const totalMastered = useMemo(() => cards.filter(c => c.mastered).length, [cards]);
  const totalReviews = useMemo(() => cards.reduce((s, c) => s + c.reviewCount, 0), [cards]);

  // ── Multiple choice generation ─────────────────────────────────────────────
  useMemo(() => {
    if (!currentCard || quizMode !== 'multiChoice') return;
    const wrongPool = cards.filter(c => c.id !== currentCard.id && c.back !== currentCard.back);
    const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
    const wrongs = shuffled.slice(0, 3).map(c => c.back);
    const choices = [...wrongs, currentCard.back].sort(() => Math.random() - 0.5);
    setMcChoices(choices);
    setMcSelected(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard?.id, quizMode]);

  // ── Persistence ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [rawDecks, rawCards, rawPomo] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_DECKS),
          AsyncStorage.getItem(STORAGE_KEY_CARDS),
          AsyncStorage.getItem(STORAGE_KEY_POMO_TOTAL),
        ]);
        if (rawDecks) setDecks(JSON.parse(rawDecks));
        if (rawCards) setCards(JSON.parse(rawCards));
        if (rawPomo) setPomodoroTotal(JSON.parse(rawPomo));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks)).catch(() => {});
  }, [decks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards)).catch(() => {});
  }, [cards, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_POMO_TOTAL, JSON.stringify(pomodoroTotal)).catch(() => {});
  }, [pomodoroTotal, loaded]);

  // ── Flashcard animations ──────────────────────────────────────────────────────

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5], [1, 0]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0,1], [0,180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0.5, 1], [0, 1]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0,1], [180,360])}deg` }],
  }));
  const cardScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleValue.value }] }));

  const handleFlip = () => {
    haptic.light();
    flipValue.value = withSpring(isFlipped ? 0 : 1, { damping: 18, stiffness: 180 });
    scaleValue.value = withSequence(withSpring(0.97), withSpring(1));
    setIsFlipped(f => !f);
  };

  const handleDifficulty = (diff: 'easy'|'good'|'hard'|'again') => {
    haptic.medium();
    setShowHint(false); setMcSelected(null);
    setSessionResults(prev => ({ ...prev, [diff]: prev[diff] + 1 }));
    // Update card
    setCards(prev => prev.map(c => c.id === currentCard.id ? {
      ...c, difficulty: diff, reviewCount: c.reviewCount + 1,
      mastered: diff === 'easy' && c.reviewCount >= 3,
      interval: diff === 'again' ? 1 : diff === 'hard' ? Math.max(1, c.interval - 1) : diff === 'good' ? c.interval * c.easeFactor : c.interval * c.easeFactor * 1.3,
      easeFactor: diff === 'again' ? Math.max(1.3, c.easeFactor - 0.2) : diff === 'hard' ? Math.max(1.3, c.easeFactor - 0.15) : diff === 'easy' ? c.easeFactor + 0.15 : c.easeFactor,
      nextReview: new Date(Date.now() + (diff === 'again' ? 60000 : diff === 'hard' ? 86400000 * 4 : diff === 'good' ? 86400000 * 8 : 86400000 * 14)).toISOString(),
    } : c));
    flipValue.value = withTiming(0, { duration: 200 });
    setIsFlipped(false);
    if (currentIdx < reviewQueue.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 250);
    } else {
      setSessionComplete(true);
      setDecks(prev => prev.map(d => d.id === reviewDeckId ? { ...d, streak: d.streak + 1, masteredCount: cards.filter(c => c.deckId === reviewDeckId && c.mastered).length } : d));
    }
  };

  const startReview = (deck: Deck, mode?: QuizMode) => {
    const dc = cards.filter(c => c.deckId === deck.id);
    if (!dc.length) { Alert.alert('No Cards', 'Add flashcards to this deck first!'); return; }
    setReviewDeckId(deck.id);
    setReviewQueue([...dc].sort(() => Math.random() - 0.5));
    setCurrentIdx(0); setIsFlipped(false); flipValue.value = 0;
    setSessionComplete(false); setSessionResults({ easy:0, good:0, hard:0, again:0 });
    setShowHint(false); setMcSelected(null);
    if (mode) setQuizMode(mode);
    setActiveTab('review'); haptic.success();
  };

  const endReview = () => {
    setReviewDeckId(null); setActiveTab('decks');
    setSessionComplete(false); setCurrentIdx(0); flipValue.value = 0;
  };

  const createDeck = () => {
    if (!newDeckName.trim()) return;
    const id = `d${Date.now()}`;
    setDecks(p => [...p, {
      id, name: newDeckName.trim(), color: newDeckColor, emoji: newDeckEmoji,
      description: newDeckDesc.trim(), cardCount: 0, masteredCount: 0,
      createdAt: new Date().toISOString(), streak: 0,
    }]);
    if (!newCardDeck) setNewCardDeck(id);
    setNewDeckName(''); setNewDeckDesc(''); setShowCreateDeck(false); haptic.success();
  };

  const createCard = () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !newCardDeck) {
      Alert.alert('Missing Fields', 'Please fill in both sides and select a deck.'); return;
    }
    const id = `c${Date.now()}`;
    const tags = newCardTag.split(',').map(t => t.trim()).filter(Boolean);
    setCards(p => [...p, {
      id, front: newCardFront.trim(), back: newCardBack.trim(), hint: newCardHint.trim() || undefined,
      deckId: newCardDeck, difficulty: 'good', interval: 0, easeFactor: 2.5,
      nextReview: new Date().toISOString(), reviewCount: 0, mastered: false, tags,
    }]);
    setDecks(p => p.map(d => d.id === newCardDeck ? { ...d, cardCount: d.cardCount + 1 } : d));
    setNewCardFront(''); setNewCardBack(''); setNewCardHint(''); setNewCardTag(''); setShowCreateCard(false); haptic.success();
  };

  const deleteDeck = (deckId: string) => {
    Alert.alert('Delete Deck', 'Delete this deck and all its cards?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setDecks(p => p.filter(d => d.id !== deckId));
        setCards(p => p.filter(c => c.deckId !== deckId));
        haptic.warning();
      }},
    ]);
  };

  const deleteCard = (cardId: string, deckId: string) => {
    setCards(p => p.filter(c => c.id !== cardId));
    setDecks(p => p.map(d => d.id === deckId ? { ...d, cardCount: Math.max(0, d.cardCount - 1) } : d));
    haptic.warning();
  };

  // ── Pomodoro ──────────────────────────────────────────────────────────────────

  const pomodoroDuration = useCallback((mode: PomodoroMode) =>
    mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 20 * 60, []);

  useEffect(() => {
    if (pomodoroActive) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroTime(prev => {
          const total = pomodoroDuration(pomodoroMode);
          if (prev <= 1) {
            clearInterval(pomodoroRef.current!);
            setPomodoroActive(false); haptic.success(); setPomodoroTotal(t => t + 1);
            pomodoroProgress.value = withTiming(1);
            return total;
          }
          pomodoroProgress.value = withTiming((prev - 1) / total, { duration: 800 });
          return prev - 1;
        });
      }, 1000);
    } else if (pomodoroRef.current) {
      clearInterval(pomodoroRef.current);
    }
    return () => { if (pomodoroRef.current) clearInterval(pomodoroRef.current); };
  }, [pomodoroActive, pomodoroMode]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pomodoroBarStyle = useAnimatedStyle(() => ({ width: `${pomodoroProgress.value * 100}%` as any }));

  const tabs: { id: StudyTab; label: string; icon: string }[] = [
    { id: 'decks', label: 'Decks', icon: 'cards-outline' },
    { id: 'review', label: 'Review', icon: 'brain' },
    { id: 'stats', label: 'Stats', icon: 'chart-bar' },
    { id: 'pomodoro', label: 'Focus', icon: 'timer-outline' },
  ];

  return (
    <View style={{ flex:1, backgroundColor:colors.background }}>
      {/* Header */}
      <View style={{ paddingTop:topPad+8, paddingHorizontal:20, paddingBottom:12, flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between' }}>
        <View>
          <Text style={{ fontSize:Colors.font.sm, color:colors.textMuted, fontWeight:'600', marginBottom:2 }}>🔥 {decks.reduce((a,d) => Math.max(a, d.streak), 0)}-day streak</Text>
          <Text style={{ fontSize:Colors.font.xxxl, fontWeight:'900', color:colors.text }}>Study</Text>
        </View>
        <View style={{ flexDirection:'row', gap:8 }}>
          <TouchableOpacity style={{ backgroundColor:colors.primarySoft, borderRadius:12, padding:10 }} onPress={() => { setShowCreateCard(true); haptic.light(); }}>
            <MaterialCommunityIcons name="card-plus-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:12, padding:10 }} onPress={() => { setShowCreateDeck(true); haptic.light(); }}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection:'row', marginHorizontal:16, marginBottom:16, backgroundColor:colors.inputBg, borderRadius:14, padding:4, gap:2 }}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.id}
            style={[{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:8, borderRadius:11, gap:4 },
              activeTab===tab.id && { backgroundColor:colors.surface, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:4, elevation:2 }]}
            onPress={() => { setActiveTab(tab.id); haptic.select(); }}>
            <MaterialCommunityIcons name={tab.icon as any} size={15} color={activeTab===tab.id ? colors.primary : colors.textMuted} />
            <Text style={{ fontSize:12, fontWeight:'700', color:activeTab===tab.id ? colors.primary : colors.textMuted }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── DECKS TAB ── */}
      {activeTab==='decks' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}>
          <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
            <StatBadge label="Cards" value={cards.length} icon="cards" color={colors.primary} />
            <StatBadge label="Mastered" value={totalMastered} icon="check-circle" color="#10b981" />
            <StatBadge label="Decks" value={decks.length} icon="folder-multiple" color="#8b5cf6" />
          </View>

          <Text style={{ fontSize:Colors.font.sm, fontWeight:'800', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>
            My Decks ({decks.length})
          </Text>

          {decks.length === 0 && (
            <View style={{ alignItems:'center', paddingVertical:48, gap:12 }}>
              <MaterialCommunityIcons name="cards-outline" size={56} color={colors.textMuted} />
              <Text style={{ fontSize:Colors.font.base, fontWeight:'700', color:colors.textSecondary }}>No decks yet</Text>
              <Text style={{ fontSize:Colors.font.sm, color:colors.textMuted, textAlign:'center' }}>Create your first deck to start studying!</Text>
              <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:14, paddingHorizontal:24, paddingVertical:12, marginTop:8 }} onPress={() => setShowCreateDeck(true)}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:Colors.font.base }}>Create First Deck</Text>
              </TouchableOpacity>
            </View>
          )}

          {decks.map((deck, i) => {
            const dc = cards.filter(c => c.deckId === deck.id);
            const prog = dc.length > 0 ? dc.filter(c => c.mastered).length / dc.length : 0;
            return (
              <Animated.View key={deck.id} entering={FadeInDown.delay(i * 60).springify()}>
                <TouchableOpacity
                  style={{ backgroundColor:colors.card, borderRadius:20, padding:16, marginBottom:12, borderWidth:1, borderColor:colors.border, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:2 }}
                  onLongPress={() => deleteDeck(deck.id)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
                    <View style={{ width:52, height:52, borderRadius:16, backgroundColor:deck.color+'20', alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:26 }}>{deck.emoji}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:Colors.font.base, fontWeight:'800', color:colors.text }}>{deck.name}</Text>
                      {!!deck.description && <Text style={{ fontSize:Colors.font.sm, color:colors.textSecondary, marginTop:1 }} numberOfLines={1}>{deck.description}</Text>}
                      <View style={{ flexDirection:'row', gap:12, marginTop:5 }}>
                        <Text style={{ fontSize:Colors.font.xs, color:colors.textMuted, fontWeight:'600' }}>{dc.length} cards</Text>
                        <Text style={{ fontSize:Colors.font.xs, color:'#10b981', fontWeight:'600' }}>{dc.filter(c=>c.mastered).length} mastered</Text>
                        {deck.streak > 0 && <Text style={{ fontSize:Colors.font.xs, color:'#f59e0b', fontWeight:'600' }}>🔥 {deck.streak}d</Text>}
                      </View>
                    </View>
                    <TouchableOpacity style={{ backgroundColor:deck.color, borderRadius:12, paddingHorizontal:14, paddingVertical:8 }} onPress={() => startReview(deck)}>
                      <Text style={{ color:'#fff', fontWeight:'700', fontSize:Colors.font.sm }}>Study</Text>
                    </TouchableOpacity>
                  </View>
                  {dc.length > 0 && (
                    <View style={{ marginTop:12 }}>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
                        <Text style={{ fontSize:Colors.font.xs, color:colors.textMuted, fontWeight:'600' }}>Progress</Text>
                        <Text style={{ fontSize:Colors.font.xs, color:deck.color, fontWeight:'700' }}>{Math.round(prog * 100)}%</Text>
                      </View>
                      <View style={{ height:6, backgroundColor:colors.border, borderRadius:3, overflow:'hidden' }}>
                        <View style={{ height:'100%', borderRadius:3, backgroundColor:deck.color, width:`${prog * 100}%` }} />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* ── REVIEW TAB ── */}
      {activeTab==='review' && (
        <View style={{ flex:1, paddingHorizontal:16, paddingBottom:100 }}>
          {!reviewDeckId ? (
            <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:16 }}>
              <MaterialCommunityIcons name="brain" size={64} color={colors.textMuted} />
              <Text style={{ fontSize:Colors.font.xl, fontWeight:'800', color:colors.text }}>Ready to study?</Text>
              <Text style={{ fontSize:Colors.font.base, color:colors.textSecondary, textAlign:'center' }}>Choose a deck from the Decks tab to start a review session.</Text>
              <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:14, paddingHorizontal:24, paddingVertical:14, marginTop:8 }} onPress={() => setActiveTab('decks')}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:Colors.font.base }}>Browse Decks</Text>
              </TouchableOpacity>
            </View>
          ) : sessionComplete ? (
            <Animated.View entering={FadeIn} style={{ flex:1, alignItems:'center', justifyContent:'center', gap:16 }}>
              <Text style={{ fontSize:48 }}>🎉</Text>
              <Text style={{ fontSize:Colors.font.xxl, fontWeight:'900', color:colors.text }}>Session Complete!</Text>
              <Text style={{ fontSize:Colors.font.base, color:colors.textSecondary }}>Great job reviewing {reviewQueue.length} cards</Text>
              <View style={{ flexDirection:'row', gap:10, marginTop:8 }}>
                {Object.entries(sessionResults).map(([diff, count]) => {
                  const cfg = { again:{c:'#ef4444',l:'Again'}, hard:{c:'#f59e0b',l:'Hard'}, good:{c:'#3b82f6',l:'Good'}, easy:{c:'#10b981',l:'Easy'} }[diff as 'again'|'hard'|'good'|'easy'];
                  return <View key={diff} style={{ backgroundColor:cfg.c+'22', borderRadius:12, padding:14, alignItems:'center', minWidth:70 }}>
                    <Text style={{ fontSize:22, fontWeight:'900', color:cfg.c }}>{count}</Text>
                    <Text style={{ fontSize:Colors.font.xs, color:cfg.c+'aa', fontWeight:'700' }}>{cfg.l}</Text>
                  </View>;
                })}
              </View>
              <View style={{ flexDirection:'row', gap:12, marginTop:8 }}>
                <TouchableOpacity style={{ backgroundColor:colors.inputBg, borderRadius:14, paddingHorizontal:20, paddingVertical:12 }} onPress={() => { startReview(decks.find(d => d.id === reviewDeckId)!); }}>
                  <Text style={{ color:colors.text, fontWeight:'700' }}>Review Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:14, paddingHorizontal:20, paddingVertical:12 }} onPress={endReview}>
                  <Text style={{ color:'#fff', fontWeight:'700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : currentCard ? (
            <View style={{ flex:1 }}>
              {/* Progress + mode toggle */}
              <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:12, marginTop:4 }}>
                <View style={{ flex:1, height:6, backgroundColor:colors.border, borderRadius:3, overflow:'hidden' }}>
                  <View style={{ height:'100%', borderRadius:3, backgroundColor:colors.primary, width:`${((currentIdx) / reviewQueue.length) * 100}%` }} />
                </View>
                <Text style={{ fontSize:Colors.font.xs, color:colors.textMuted, fontWeight:'600' }}>{currentIdx + 1}/{reviewQueue.length}</Text>
                <TouchableOpacity onPress={endReview}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Mode toggle */}
              <View style={{ flexDirection:'row', backgroundColor:colors.inputBg, borderRadius:12, padding:3, marginBottom:12, gap:2 }}>
                {([{id:'flashcard',icon:'rotate-3d-variant',label:'Flashcard'},{id:'multiChoice',icon:'format-list-radio',label:'Quiz'}] as const).map(m => (
                  <TouchableOpacity key={m.id} style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:7, borderRadius:9, backgroundColor: quizMode===m.id ? colors.surface : 'transparent' }}
                    onPress={() => { setQuizMode(m.id); setIsFlipped(false); flipValue.value=0; setMcSelected(null); setShowHint(false); haptic.select(); }}>
                    <MaterialCommunityIcons name={m.icon} size={14} color={quizMode===m.id ? colors.primary : colors.textMuted} />
                    <Text style={{ fontSize:12, fontWeight:'700', color:quizMode===m.id ? colors.primary : colors.textMuted }}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Card (Flashcard mode) */}
              {quizMode === 'flashcard' ? (
                <>
                  <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} style={{ flex:1, maxHeight:300 }}>
                    <Animated.View style={[{ flex:1, backgroundColor:colors.card, borderRadius:24, borderWidth:1, borderColor:colors.border, padding:28, alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.1, shadowRadius:20, elevation:6 }, cardScaleStyle]}>
                      <Animated.View style={[StyleSheet.absoluteFill, { alignItems:'center', justifyContent:'center', padding:28 }, frontStyle]}>
                        <Text style={{ fontSize:Colors.font.xs, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:16 }}>Question</Text>
                        <Text style={{ fontSize:Colors.font.xl, fontWeight:'700', color:colors.text, textAlign:'center', lineHeight:30 }}>{currentCard.front}</Text>
                        {currentCard.tags.length > 0 && (
                          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:16, justifyContent:'center' }}>
                            {currentCard.tags.map(t => <View key={t} style={{ backgroundColor:colors.primarySoft, borderRadius:99, paddingHorizontal:10, paddingVertical:3 }}><Text style={{ fontSize:Colors.font.xs, color:colors.primary, fontWeight:'600' }}>#{t}</Text></View>)}
                          </View>
                        )}
                      </Animated.View>
                      <Animated.View style={[StyleSheet.absoluteFill, { alignItems:'center', justifyContent:'center', padding:28 }, backStyle]}>
                        <Text style={{ fontSize:Colors.font.xs, fontWeight:'700', color:'#10b981', textTransform:'uppercase', letterSpacing:0.5, marginBottom:16 }}>Answer</Text>
                        <Text style={{ fontSize:Colors.font.base, color:colors.text, textAlign:'center', lineHeight:26 }}>{currentCard.back}</Text>
                      </Animated.View>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Hint + flip */}
                  <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
                    {currentCard.hint && !isFlipped && (
                      <TouchableOpacity onPress={() => setShowHint(v => !v)} style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:colors.border, minWidth:52 }}>
                        <MaterialCommunityIcons name={showHint ? 'lightbulb' : 'lightbulb-outline'} size={18} color={showHint ? '#f59e0b' : colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleFlip} style={{ flex:1 }}>
                      <View style={{ backgroundColor:colors.inputBg, borderRadius:16, padding:14, alignItems:'center', borderWidth:1, borderColor:colors.border, flexDirection:'row', justifyContent:'center', gap:8 }}>
                        <MaterialCommunityIcons name="rotate-3d-variant" size={18} color={colors.textSecondary} />
                        <Text style={{ fontSize:Colors.font.base, color:colors.textSecondary, fontWeight:'600' }}>{isFlipped ? 'View Question' : 'Reveal Answer'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {showHint && currentCard.hint && (
                    <Animated.View entering={FadeInDown.duration(200)} style={{ backgroundColor:'#fef3c7', borderRadius:14, padding:12, marginTop:8, flexDirection:'row', gap:8, alignItems:'flex-start' }}>
                      <MaterialCommunityIcons name="lightbulb" size={16} color='#f59e0b' />
                      <Text style={{ flex:1, fontSize:Colors.font.sm, color:'#92400e' }}>{currentCard.hint}</Text>
                    </Animated.View>
                  )}

                  {isFlipped && (
                    <Animated.View entering={FadeInDown.springify()} style={{ marginTop:12 }}>
                      <Text style={{ fontSize:Colors.font.xs, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, textAlign:'center', marginBottom:10 }}>How well did you know this?</Text>
                      <View style={{ flexDirection:'row', gap:8 }}>
                        {([
                          { label:'Again', sub:'<1m', color:'#ef4444', diff:'again' as const },
                          { label:'Hard',  sub:'4d',  color:'#f59e0b', diff:'hard' as const },
                          { label:'Good',  sub:'8d',  color:'#3b82f6', diff:'good' as const },
                          { label:'Easy',  sub:'14d', color:'#10b981', diff:'easy' as const },
                        ]).map(btn => (
                          <TouchableOpacity key={btn.diff} style={{ flex:1, backgroundColor:btn.color, borderRadius:14, paddingVertical:12, alignItems:'center', gap:2 }} onPress={() => handleDifficulty(btn.diff)}>
                            <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.sm }}>{btn.label}</Text>
                            <Text style={{ color:'rgba(255,255,255,0.7)', fontSize:10 }}>{btn.sub}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </Animated.View>
                  )}
                </>
              ) : (
                /* ── Multiple Choice Mode ── */
                <View style={{ flex:1 }}>
                  <View style={{ backgroundColor:colors.card, borderRadius:24, borderWidth:1, borderColor:colors.border, padding:24, marginBottom:14, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:12, elevation:4 }}>
                    <Text style={{ fontSize:Colors.font.xs, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Question</Text>
                    <Text style={{ fontSize:Colors.font.xl, fontWeight:'700', color:colors.text, textAlign:'center', lineHeight:30 }}>{currentCard.front}</Text>
                  </View>
                  {mcChoices.map((choice, ci) => {
                    const isCorrect = choice === currentCard.back;
                    const isSelected = mcSelected === choice;
                    const revealed = mcSelected !== null;
                    let bg = colors.inputBg; let border = colors.border; let tc = colors.text;
                    if (revealed && isCorrect) { bg = '#f0fdf4'; border = '#22c55e'; tc = '#166534'; }
                    else if (revealed && isSelected && !isCorrect) { bg = '#fff1f2'; border = '#ef4444'; tc = '#9f1239'; }
                    return (
                      <TouchableOpacity key={ci} disabled={revealed}
                        style={{ backgroundColor:bg, borderRadius:16, borderWidth:2, borderColor:border, padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12 }}
                        onPress={() => {
                          setMcSelected(choice);
                          haptic.light();
                          if (isCorrect) {
                            setTimeout(() => handleDifficulty('easy'), 900);
                          } else {
                            setTimeout(() => handleDifficulty('again'), 1200);
                          }
                        }}>
                        <View style={{ width:28, height:28, borderRadius:14, borderWidth:2, borderColor:border, alignItems:'center', justifyContent:'center', backgroundColor: revealed && isCorrect ? '#22c55e' : (revealed && isSelected ? '#ef4444' : 'transparent') }}>
                          {revealed && isCorrect && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                          {revealed && isSelected && !isCorrect && <MaterialCommunityIcons name="close" size={14} color="#fff" />}
                          {!revealed && <Text style={{ fontSize:11, fontWeight:'800', color:colors.textMuted }}>{String.fromCharCode(65+ci)}</Text>}
                        </View>
                        <Text style={{ flex:1, fontSize:Colors.font.sm, fontWeight:'600', color:tc, lineHeight:20 }}>{choice}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}

      {/* ── STATS TAB ── */}
      {activeTab==='stats' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}>
          <Animated.View entering={FadeInDown.springify()}>
            <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, marginBottom:12 }}>📊 Overview</Text>
              <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
                <StatBadge label="Cards" value={cards.length} icon="cards" color={colors.primary} />
                <StatBadge label="Mastered" value={totalMastered} icon="check-circle" color="#10b981" />
                <StatBadge label="Reviews" value={totalReviews} icon="refresh" color="#f59e0b" />
              </View>
              <View style={{ flexDirection:'row', gap:10 }}>
                <StatBadge label="Decks" value={decks.length} icon="folder-multiple" color="#8b5cf6" />
                <StatBadge label="Retention" value={cards.length > 0 ? `${Math.round((totalMastered / cards.length) * 100)}%` : '—'} icon="brain" color="#06b6d4" />
                <StatBadge label="Focus" value={`${pomodoroTotal * 25}m`} icon="timer" color="#ec4899" />
              </View>
            </View>

            <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, marginBottom:16 }}>📅 Weekly Activity</Text>
              <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6, height:80 }}>
                {[18,34,12,48,28,52,24].map((v, i) => {
                  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                  const isToday = i === 6;
                  return (
                    <View key={i} style={{ flex:1, alignItems:'center', gap:4 }}>
                      <View style={{ width:'100%', height:(v/52)*64, borderRadius:6, backgroundColor:isToday ? colors.primary : colors.primarySoft }} />
                      <Text style={{ fontSize:9, color:isToday ? colors.primary : colors.textMuted, fontWeight:'700' }}>{days[i]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, marginBottom:14 }}>🎯 Deck Performance</Text>
              {decks.map(deck => {
                const dc = cards.filter(c => c.deckId === deck.id);
                const ret = dc.length > 0 ? Math.round((dc.filter(c => c.difficulty==='easy'||c.difficulty==='good').length / dc.length) * 100) : 0;
                return (
                  <View key={deck.id} style={{ marginBottom:14 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                      <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.text }}>{deck.emoji} {deck.name}</Text>
                      <Text style={{ fontSize:Colors.font.sm, fontWeight:'800', color:ret>=80?'#10b981':ret>=60?'#f59e0b':'#ef4444' }}>{ret}%</Text>
                    </View>
                    <View style={{ height:8, backgroundColor:colors.border, borderRadius:4, overflow:'hidden' }}>
                      <View style={{ height:'100%', borderRadius:4, backgroundColor:deck.color, width:`${ret}%` }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── POMODORO TAB ── */}
      {activeTab==='pomodoro' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120, alignItems:'center' }}>
          <Animated.View entering={FadeIn} style={{ width:'100%', alignItems:'center' }}>
            <View style={{ flexDirection:'row', gap:8, marginBottom:28, width:'100%' }}>
              {([{ id:'focus', label:'Focus', mins:25 }, { id:'short', label:'Short Break', mins:5 }, { id:'long', label:'Long Break', mins:20 }] as { id:PomodoroMode; label:string; mins:number }[]).map(mode => (
                <TouchableOpacity key={mode.id}
                  style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', backgroundColor:pomodoroMode===mode.id ? colors.primary : colors.inputBg }}
                  onPress={() => { setPomodoroMode(mode.id); setPomodoroTime(pomodoroDuration(mode.id)); setPomodoroActive(false); pomodoroProgress.value = 1; haptic.select(); }}>
                  <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:pomodoroMode===mode.id ? '#fff' : colors.textSecondary }}>{mode.label}</Text>
                  <Text style={{ fontSize:11, color:pomodoroMode===mode.id ? 'rgba(255,255,255,0.75)' : colors.textMuted }}>{mode.mins} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ width:240, height:240, borderRadius:120, backgroundColor:colors.card, borderWidth:8, borderColor:colors.primary+'30', alignItems:'center', justifyContent:'center', marginBottom:24, shadowColor:colors.primary, shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:20, elevation:8 }}>
              <Text style={{ fontSize:56, fontWeight:'900', color:colors.text }}>{fmtTime(pomodoroTime)}</Text>
              <Text style={{ fontSize:Colors.font.sm, color:colors.textSecondary, marginTop:4 }}>
                {pomodoroMode==='focus' ? '🍅 Focus' : pomodoroMode==='short' ? '☕ Short Break' : '😴 Long Break'}
              </Text>
            </View>

            <View style={{ height:8, width:'80%', backgroundColor:colors.border, borderRadius:4, overflow:'hidden', marginBottom:28 }}>
              <Animated.View style={[{ height:'100%', backgroundColor:colors.primary, borderRadius:4 }, pomodoroBarStyle]} />
            </View>

            <View style={{ flexDirection:'row', gap:12, marginBottom:28 }}>
              <TouchableOpacity
                style={{ backgroundColor:colors.inputBg, borderRadius:20, paddingHorizontal:20, paddingVertical:14, borderWidth:1, borderColor:colors.border }}
                onPress={() => { setPomodoroTime(pomodoroDuration(pomodoroMode)); setPomodoroActive(false); pomodoroProgress.value = withTiming(1); haptic.select(); }}>
                <MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor:pomodoroActive ? '#ef4444' : colors.primary, borderRadius:20, paddingHorizontal:48, paddingVertical:14 }}
                onPress={() => { setPomodoroActive(a => !a); haptic.medium(); }}>
                <MaterialCommunityIcons name={pomodoroActive ? 'pause' : 'play'} size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor:colors.inputBg, borderRadius:20, paddingHorizontal:20, paddingVertical:14, borderWidth:1, borderColor:colors.border }}
                onPress={() => { setPomodoroSession(s => s % 4 + 1); haptic.select(); }}>
                <MaterialCommunityIcons name="skip-next" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection:'row', gap:10, width:'100%', backgroundColor:colors.card, borderRadius:20, padding:16, borderWidth:1, borderColor:colors.border }}>
              <StatBadge label={`Session ${pomodoroSession}/4`} value="🍅" icon="timer" color={colors.primary} />
              <StatBadge label="Completed" value={pomodoroTotal} icon="check-all" color="#10b981" />
              <StatBadge label="Focus Time" value={`${pomodoroTotal * 25}m`} icon="clock" color="#f59e0b" />
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── CREATE DECK MODAL ── */}
      <Modal visible={showCreateDeck} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }} onPress={() => setShowCreateDeck(false)}>
          <Pressable style={{ backgroundColor:colors.surface, borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:40 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:colors.border, alignSelf:'center', marginBottom:20 }} />
            <Text style={{ fontSize:Colors.font.xl, fontWeight:'800', color:colors.text, marginBottom:20 }}>New Deck</Text>
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:12, borderWidth:1, borderColor:colors.border }} placeholder="Deck name…" placeholderTextColor={colors.textMuted} value={newDeckName} onChangeText={setNewDeckName} autoFocus />
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:16, borderWidth:1, borderColor:colors.border }} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={newDeckDesc} onChangeText={setNewDeckDesc} />
            <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.textSecondary, marginBottom:10 }}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
              <View style={{ flexDirection:'row', gap:8, paddingBottom:4 }}>
                {DECK_EMOJIS.map(e => (
                  <TouchableOpacity key={e} style={{ width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:newDeckEmoji===e ? colors.primarySoft : colors.inputBg, borderWidth:newDeckEmoji===e ? 2 : 0, borderColor:colors.primary }} onPress={() => setNewDeckEmoji(e)}>
                    <Text style={{ fontSize:24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.textSecondary, marginBottom:10 }}>Color</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {DECK_COLORS.map(c => <TouchableOpacity key={c} style={{ width:36, height:36, borderRadius:18, backgroundColor:c, borderWidth:newDeckColor===c ? 3 : 0, borderColor:'#fff' }} onPress={() => setNewDeckColor(c)} />)}
            </View>
            <TouchableOpacity style={{ backgroundColor:newDeckName.trim() ? colors.primary : colors.border, borderRadius:14, padding:16, alignItems:'center' }} onPress={createDeck} disabled={!newDeckName.trim()}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.base }}>Create Deck</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── CREATE CARD MODAL ── */}
      <Modal visible={showCreateCard} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }} onPress={() => setShowCreateCard(false)}>
          <Pressable style={{ backgroundColor:colors.surface, borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:40 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:colors.border, alignSelf:'center', marginBottom:20 }} />
            <Text style={{ fontSize:Colors.font.xl, fontWeight:'800', color:colors.text, marginBottom:20 }}>New Flashcard</Text>
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:12, borderWidth:1, borderColor:colors.border, minHeight:80, textAlignVertical:'top' }} placeholder="Front — question or term…" placeholderTextColor={colors.textMuted} value={newCardFront} onChangeText={setNewCardFront} multiline autoFocus />
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:12, borderWidth:1, borderColor:colors.border, minHeight:80, textAlignVertical:'top' }} placeholder="Back — answer or definition…" placeholderTextColor={colors.textMuted} value={newCardBack} onChangeText={setNewCardBack} multiline />
            <TextInput style={{ backgroundColor:'#fef3c7', borderRadius:14, padding:14, fontSize:Colors.font.sm, color:'#92400e', marginBottom:12, borderWidth:1, borderColor:'#f59e0b44' }} placeholder="💡 Hint (optional — shown during review)" placeholderTextColor='#b45309' value={newCardHint} onChangeText={setNewCardHint} />
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.sm, color:colors.text, marginBottom:14, borderWidth:1, borderColor:colors.border }} placeholder="Tags (comma-separated, optional)" placeholderTextColor={colors.textMuted} value={newCardTag} onChangeText={setNewCardTag} />
            <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.textSecondary, marginBottom:8 }}>Select Deck</Text>
            {decks.length === 0 ? (
              <TouchableOpacity style={{ backgroundColor:colors.inputBg, borderRadius:12, padding:14, marginBottom:16, alignItems:'center', gap:4 }} onPress={() => { setShowCreateCard(false); setShowCreateDeck(true); }}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                <Text style={{ fontSize:Colors.font.sm, color:colors.primary, fontWeight:'700' }}>Create a deck first</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:20 }}>
                <View style={{ flexDirection:'row', gap:8, paddingBottom:4 }}>
                  {decks.map(d => (
                    <TouchableOpacity key={d.id} style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingVertical:10, borderRadius:12, backgroundColor:newCardDeck===d.id ? d.color : colors.inputBg, borderWidth:1, borderColor:newCardDeck===d.id ? d.color : colors.border }} onPress={() => setNewCardDeck(d.id)}>
                      <Text style={{ fontSize:16 }}>{d.emoji}</Text>
                      <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:newCardDeck===d.id ? '#fff' : colors.text }}>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            <TouchableOpacity style={{ backgroundColor:(newCardFront.trim()&&newCardBack.trim()&&newCardDeck) ? colors.primary : colors.border, borderRadius:14, padding:16, alignItems:'center' }} onPress={createCard}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.base }}>Add Flashcard</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const StyleSheet = require('react-native').StyleSheet;
