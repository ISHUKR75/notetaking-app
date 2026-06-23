import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Platform, Modal, Pressable, TextInput, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, interpolate, withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { Colors, ThemeColors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

const { height: H } = Dimensions.get('window');

interface Flashcard {
  id: string; front: string; back: string; deckId: string;
  difficulty: 'easy' | 'good' | 'hard' | 'again';
  interval: number; easeFactor: number; nextReview: string;
  reviewCount: number; mastered: boolean; tags: string[];
}

interface Deck {
  id: string; name: string; color: string; emoji: string;
  description: string; cardCount: number; masteredCount: number;
  createdAt: string; streak: number;
}

const DECK_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];
const DECK_EMOJIS = ['🧠','📚','🎯','🔬','💡','🌍','⚗️','🎨','💻','🎵','📊','🏛️','🌿','🚀','⭐'];

const INIT_DECKS: Deck[] = [
  { id:'d1', name:'General Knowledge', color:'#6366f1', emoji:'🧠', description:'Broad knowledge cards', cardCount:5, masteredCount:2, createdAt:new Date().toISOString(), streak:3 },
  { id:'d2', name:'Science',           color:'#10b981', emoji:'🔬', description:'Physics, Chemistry, Biology', cardCount:4, masteredCount:1, createdAt:new Date().toISOString(), streak:7 },
  { id:'d3', name:'History',           color:'#f59e0b', emoji:'🌍', description:'World history events', cardCount:5, masteredCount:3, createdAt:new Date().toISOString(), streak:14 },
];
const INIT_CARDS: Flashcard[] = [
  { id:'c1', front:'What is photosynthesis?', back:'Plants use sunlight, water, CO₂ to produce glucose and oxygen via chloroplasts.', deckId:'d2', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:3, mastered:false, tags:['biology'] },
  { id:'c2', front:'Who wrote Romeo and Juliet?', back:'William Shakespeare (~1594–96). One of history\'s most performed plays.', deckId:'d1', difficulty:'easy', interval:8, easeFactor:2.8, nextReview:new Date().toISOString(), reviewCount:6, mastered:true, tags:['literature'] },
  { id:'c3', front:'When did World War II end?', back:'1945. Germany surrendered May 8 (V-E Day). Japan surrendered Sep 2 (V-J Day).', deckId:'d3', difficulty:'easy', interval:8, easeFactor:2.7, nextReview:new Date().toISOString(), reviewCount:4, mastered:false, tags:['war'] },
  { id:'c4', front:"Newton's Second Law?", back:'F = ma. Net force = mass × acceleration. Measured in Newtons (N).', deckId:'d2', difficulty:'hard', interval:1, easeFactor:2.0, nextReview:new Date().toISOString(), reviewCount:1, mastered:false, tags:['physics'] },
  { id:'c5', front:'Pythagorean theorem?', back:'a² + b² = c² where c is the hypotenuse of a right triangle.', deckId:'d1', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:5, mastered:true, tags:['math'] },
  { id:'c6', front:'What is DNA?', back:'Deoxyribonucleic acid. Double-helix molecule carrying genetic info. Made of nucleotides (A,T,G,C).', deckId:'d2', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:2, mastered:false, tags:['biology'] },
  { id:'c7', front:'French Revolution?', back:'1789–1799. Ended monarchy, rose Napoleon. Storming of Bastille: July 14, 1789.', deckId:'d3', difficulty:'good', interval:4, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:3, mastered:true, tags:['france'] },
];

type StudyTab = 'decks' | 'review' | 'stats' | 'pomodoro';
type PomodoroMode = 'focus' | 'short' | 'long';

function StatBadge({ label, value, icon, color, colors }: { label:string;value:string|number;icon:string;color:string;colors:ThemeColors }) {
  return (
    <View style={{ flex:1, backgroundColor:color+'18', borderRadius:16, padding:14, alignItems:'center', gap:4 }}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={{ fontSize:22, fontWeight:'900', color }}>{value}</Text>
      <Text style={{ fontSize:10, color:color+'aa', fontWeight:'700', textTransform:'uppercase', letterSpacing:0.3, textAlign:'center' }}>{label}</Text>
    </View>
  );
}

export default function StudyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState<StudyTab>('decks');
  const [decks, setDecks] = useState<Deck[]>(INIT_DECKS);
  const [cards, setCards] = useState<Flashcard[]>(INIT_CARDS);
  const [reviewDeckId, setReviewDeckId] = useState<string|null>(null);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionResults, setSessionResults] = useState({ easy:0, good:0, hard:0, again:0 });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckColor, setNewDeckColor] = useState(DECK_COLORS[0]);
  const [newDeckEmoji, setNewDeckEmoji] = useState(DECK_EMOJIS[0]);
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardDeck, setNewCardDeck] = useState('');
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25*60);
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('focus');
  const [pomodoroTotal, setPomodoroTotal] = useState(0);
  const [pomodoroSession, setPomodoroSession] = useState(1);
  const pomodoroRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const flipValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const pomodoroProgress = useSharedValue(1);

  const currentCard = reviewQueue[currentIdx];
  const totalMastered = useMemo(() => cards.filter(c => c.mastered).length, [cards]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.5], [1, 0]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0,1], [0,180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0.5, 1], [0, 1]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0,1], [180,360])}deg` }],
  }));
  const cardScale = useAnimatedStyle(() => ({ transform: [{ scale: scaleValue.value }] }));

  const handleFlip = () => {
    haptic.light();
    if (!isFlipped) {
      flipValue.value = withSpring(1, { damping:18, stiffness:180 });
      scaleValue.value = withSequence(withSpring(0.97), withSpring(1));
    } else {
      flipValue.value = withSpring(0, { damping:18, stiffness:180 });
    }
    setIsFlipped(f => !f);
  };

  const handleDifficulty = (diff: 'easy'|'good'|'hard'|'again') => {
    haptic.medium();
    setSessionResults(prev => ({ ...prev, [diff]: prev[diff]+1 }));
    flipValue.value = withTiming(0, { duration:200 });
    setIsFlipped(false);
    if (currentIdx < reviewQueue.length-1) {
      setTimeout(() => setCurrentIdx(i => i+1), 250);
    } else {
      setSessionComplete(true);
    }
  };

  const startReview = (deck: Deck) => {
    const dc = cards.filter(c => c.deckId === deck.id);
    if (!dc.length) { Alert.alert('No Cards','Add flashcards to this deck first!'); return; }
    setReviewDeckId(deck.id);
    setReviewQueue([...dc].sort(() => Math.random()-0.5));
    setCurrentIdx(0); setIsFlipped(false); flipValue.value=0;
    setSessionComplete(false); setSessionResults({ easy:0, good:0, hard:0, again:0 });
    setActiveTab('review'); haptic.success();
  };

  const endReview = () => {
    setReviewDeckId(null); setActiveTab('decks');
    setSessionComplete(false); setCurrentIdx(0); flipValue.value=0;
  };

  const createDeck = () => {
    if (!newDeckName.trim()) return;
    const id = `d${Date.now()}`;
    setDecks(p => [...p, { id, name:newDeckName.trim(), color:newDeckColor, emoji:newDeckEmoji, description:newDeckDesc.trim(), cardCount:0, masteredCount:0, createdAt:new Date().toISOString(), streak:0 }]);
    setNewDeckName(''); setNewDeckDesc(''); setShowCreateDeck(false); haptic.success();
  };

  const createCard = () => {
    if (!newCardFront.trim()||!newCardBack.trim()||!newCardDeck) return;
    const id = `c${Date.now()}`;
    setCards(p => [...p, { id, front:newCardFront.trim(), back:newCardBack.trim(), deckId:newCardDeck, difficulty:'good', interval:0, easeFactor:2.5, nextReview:new Date().toISOString(), reviewCount:0, mastered:false, tags:[] }]);
    setDecks(p => p.map(d => d.id===newCardDeck ? { ...d, cardCount:d.cardCount+1 } : d));
    setNewCardFront(''); setNewCardBack(''); setShowCreateCard(false); haptic.success();
  };

  const deleteDeck = (deckId: string) => {
    Alert.alert('Delete Deck','Delete this deck and all cards?', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress:() => { setDecks(p=>p.filter(d=>d.id!==deckId)); setCards(p=>p.filter(c=>c.deckId!==deckId)); haptic.warning(); } },
    ]);
  };

  useEffect(() => {
    if (pomodoroActive) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroTime(prev => {
          const totalSecs = pomodoroMode==='focus' ? 25*60 : pomodoroMode==='short' ? 5*60 : 20*60;
          if (prev<=1) {
            clearInterval(pomodoroRef.current!);
            setPomodoroActive(false); haptic.success(); setPomodoroTotal(t=>t+1);
            pomodoroProgress.value = withTiming(1);
            return totalSecs;
          }
          pomodoroProgress.value = withTiming((prev-1)/totalSecs, { duration:800 });
          return prev-1;
        });
      }, 1000);
    } else if (pomodoroRef.current) {
      clearInterval(pomodoroRef.current);
    }
    return () => { if (pomodoroRef.current) clearInterval(pomodoroRef.current); };
  }, [pomodoroActive, pomodoroMode]);

  const fmtTime = (s:number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const pomodoroBar = useAnimatedStyle(() => ({ width:`${pomodoroProgress.value*100}%` as any }));

  const tabs: { id:StudyTab; label:string; icon:string }[] = [
    { id:'decks', label:'Decks', icon:'cards-outline' },
    { id:'review', label:'Review', icon:'brain' },
    { id:'stats', label:'Stats', icon:'chart-bar' },
    { id:'pomodoro', label:'Focus', icon:'timer-outline' },
  ];

  return (
    <View style={{ flex:1, backgroundColor:colors.background }}>
      <View style={{ paddingTop:topPad+8, paddingHorizontal:20, paddingBottom:12, flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between' }}>
        <View>
          <Text style={{ fontSize:Colors.font.sm, color:colors.textMuted, fontWeight:'600', marginBottom:2 }}>🔥 14-day streak</Text>
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

      {activeTab==='decks' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}>
          <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
            <StatBadge label="Cards" value={cards.length} icon="cards" color={colors.primary} colors={colors} />
            <StatBadge label="Mastered" value={totalMastered} icon="check-circle" color="#10b981" colors={colors} />
            <StatBadge label="Decks" value={decks.length} icon="folder-multiple" color="#8b5cf6" colors={colors} />
          </View>
          <Text style={{ fontSize:Colors.font.sm, fontWeight:'800', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>My Decks ({decks.length})</Text>
          {decks.map((deck,i) => {
            const dc = cards.filter(c=>c.deckId===deck.id);
            const prog = deck.cardCount>0 ? deck.masteredCount/deck.cardCount : 0;
            return (
              <Animated.View key={deck.id} entering={FadeInDown.delay(i*60).springify()}>
                <TouchableOpacity
                  style={{ backgroundColor:colors.card, borderRadius:20, padding:16, marginBottom:12, borderWidth:1, borderColor:colors.border, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:2 }}
                  onLongPress={() => deleteDeck(deck.id)}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
                    <View style={{ width:52, height:52, borderRadius:16, backgroundColor:deck.color+'20', alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:26 }}>{deck.emoji}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:Colors.font.base, fontWeight:'800', color:colors.text }}>{deck.name}</Text>
                      {deck.description ? <Text style={{ fontSize:Colors.font.sm, color:colors.textSecondary, marginTop:1 }} numberOfLines={1}>{deck.description}</Text> : null}
                      <View style={{ flexDirection:'row', gap:12, marginTop:6 }}>
                        <Text style={{ fontSize:Colors.font.xs, color:colors.textMuted, fontWeight:'600' }}>{dc.length} cards</Text>
                        <Text style={{ fontSize:Colors.font.xs, color:'#10b981', fontWeight:'600' }}>{deck.masteredCount} mastered</Text>
                        {deck.streak>0 && <Text style={{ fontSize:Colors.font.xs, color:'#f59e0b', fontWeight:'600' }}>🔥 {deck.streak}d</Text>}
                      </View>
                    </View>
                    <TouchableOpacity style={{ backgroundColor:deck.color, borderRadius:12, paddingHorizontal:14, paddingVertical:8 }} onPress={() => startReview(deck)}>
                      <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.sm }}>Study</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop:12 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                      <Text style={{ fontSize:10, color:colors.textMuted, fontWeight:'600' }}>Progress</Text>
                      <Text style={{ fontSize:10, color:colors.primary, fontWeight:'700' }}>{Math.round(prog*100)}%</Text>
                    </View>
                    <View style={{ height:5, backgroundColor:colors.border, borderRadius:3, overflow:'hidden' }}>
                      <View style={{ width:`${prog*100}%`, height:'100%', backgroundColor:deck.color, borderRadius:3 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          {decks.length===0 && (
            <View style={{ alignItems:'center', padding:40 }}>
              <Text style={{ fontSize:48, marginBottom:12 }}>🧠</Text>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, textAlign:'center' }}>No Decks Yet</Text>
              <Text style={{ fontSize:Colors.font.sm, color:colors.textSecondary, textAlign:'center', marginTop:8 }}>Create your first flashcard deck to start studying</Text>
              <TouchableOpacity style={{ marginTop:16, backgroundColor:colors.primary, borderRadius:Colors.radius.full, paddingHorizontal:24, paddingVertical:12 }} onPress={() => setShowCreateDeck(true)}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>Create Deck</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab==='review' && (
        <View style={{ flex:1, paddingHorizontal:16 }}>
          {!reviewDeckId ? (
            <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:16 }}>
              <Text style={{ fontSize:48 }}>📚</Text>
              <Text style={{ fontSize:Colors.font.xl, fontWeight:'800', color:colors.text, textAlign:'center' }}>Select a deck to review</Text>
              <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:Colors.radius.full, paddingHorizontal:24, paddingVertical:12 }} onPress={() => setActiveTab('decks')}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>Browse Decks</Text>
              </TouchableOpacity>
            </View>
          ) : sessionComplete ? (
            <Animated.View entering={FadeIn} style={{ flex:1, alignItems:'center', justifyContent:'center', gap:16 }}>
              <Text style={{ fontSize:60 }}>🎉</Text>
              <Text style={{ fontSize:Colors.font.xl, fontWeight:'900', color:colors.text }}>Session Complete!</Text>
              <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, width:'100%', borderWidth:1, borderColor:colors.border }}>
                <Text style={{ fontSize:Colors.font.base, fontWeight:'700', color:colors.textSecondary, textAlign:'center', marginBottom:16 }}>{reviewQueue.length} cards reviewed</Text>
                <View style={{ flexDirection:'row', gap:8 }}>
                  {[{ label:'Easy', count:sessionResults.easy, color:'#10b981' }, { label:'Good', count:sessionResults.good, color:'#3b82f6' }, { label:'Hard', count:sessionResults.hard, color:'#f59e0b' }, { label:'Again', count:sessionResults.again, color:'#ef4444' }].map(r => (
                    <View key={r.label} style={{ flex:1, backgroundColor:r.color+'15', borderRadius:12, padding:10, alignItems:'center' }}>
                      <Text style={{ fontSize:20, fontWeight:'900', color:r.color }}>{r.count}</Text>
                      <Text style={{ fontSize:10, color:r.color, fontWeight:'700' }}>{r.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:Colors.radius.full, paddingHorizontal:32, paddingVertical:14 }} onPress={endReview}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.base }}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : currentCard ? (
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <TouchableOpacity onPress={endReview}><MaterialCommunityIcons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
                <View style={{ flex:1, marginHorizontal:12 }}>
                  <View style={{ height:6, backgroundColor:colors.border, borderRadius:3, overflow:'hidden' }}>
                    <View style={{ height:'100%', borderRadius:3, backgroundColor:colors.primary, width:`${((currentIdx+1)/reviewQueue.length)*100}%` }} />
                  </View>
                  <Text style={{ fontSize:11, color:colors.textMuted, textAlign:'center', marginTop:4, fontWeight:'600' }}>{currentIdx+1} / {reviewQueue.length}</Text>
                </View>
                <View style={{ width:24 }} />
              </View>

              <Animated.View style={[{ position:'relative', height:H*0.38 }, cardScale]}>
                <Animated.View style={[{ position:'absolute', inset:0, backgroundColor:colors.card, borderRadius:24, padding:28, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:colors.primary+'40', shadowColor:colors.primary, shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:20, elevation:8, backfaceVisibility:'hidden' }, frontStyle]}>
                  <View style={{ backgroundColor:colors.primarySoft, borderRadius:12, paddingHorizontal:12, paddingVertical:4, marginBottom:16 }}>
                    <Text style={{ fontSize:11, color:colors.primary, fontWeight:'800', textTransform:'uppercase', letterSpacing:0.5 }}>Question</Text>
                  </View>
                  <Text style={{ fontSize:Colors.font.xl, fontWeight:'700', color:colors.text, textAlign:'center', lineHeight:30 }}>{currentCard.front}</Text>
                  <Text style={{ fontSize:Colors.font.sm, color:colors.textMuted, marginTop:20 }}>Tap to reveal answer</Text>
                </Animated.View>
                <Animated.View style={[{ position:'absolute', inset:0, backgroundColor:colors.card, borderRadius:24, padding:28, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:'#10b981'+'40', backfaceVisibility:'hidden' }, backStyle]}>
                  <View style={{ backgroundColor:'#10b98120', borderRadius:12, paddingHorizontal:12, paddingVertical:4, marginBottom:16 }}>
                    <Text style={{ fontSize:11, color:'#10b981', fontWeight:'800', textTransform:'uppercase', letterSpacing:0.5 }}>Answer</Text>
                  </View>
                  <Text style={{ fontSize:Colors.font.base, fontWeight:'500', color:colors.text, textAlign:'center', lineHeight:24 }}>{currentCard.back}</Text>
                </Animated.View>
              </Animated.View>

              <TouchableOpacity onPress={handleFlip} style={{ marginTop:12 }}>
                <View style={{ backgroundColor:colors.inputBg, borderRadius:16, padding:14, alignItems:'center', borderWidth:1, borderColor:colors.border, flexDirection:'row', justifyContent:'center', gap:8 }}>
                  <MaterialCommunityIcons name="rotate-3d-variant" size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize:Colors.font.base, color:colors.textSecondary, fontWeight:'600' }}>{isFlipped ? 'View Question' : 'Reveal Answer'}</Text>
                </View>
              </TouchableOpacity>

              {isFlipped && (
                <Animated.View entering={FadeInDown.springify()} style={{ marginTop:16 }}>
                  <Text style={{ fontSize:Colors.font.xs, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, textAlign:'center', marginBottom:10 }}>How well did you know this?</Text>
                  <View style={{ flexDirection:'row', gap:8 }}>
                    {[
                      { label:'Again', sub:'<1m', color:'#ef4444', diff:'again' as const },
                      { label:'Hard',  sub:'4d',  color:'#f59e0b', diff:'hard' as const },
                      { label:'Good',  sub:'8d',  color:'#3b82f6', diff:'good' as const },
                      { label:'Easy',  sub:'14d', color:'#10b981', diff:'easy' as const },
                    ].map(btn => (
                      <TouchableOpacity key={btn.diff} style={{ flex:1, backgroundColor:btn.color, borderRadius:14, paddingVertical:12, alignItems:'center', gap:2 }} onPress={() => handleDifficulty(btn.diff)}>
                        <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.sm }}>{btn.label}</Text>
                        <Text style={{ color:'rgba(255,255,255,0.7)', fontSize:10 }}>{btn.sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>
          ) : null}
        </View>
      )}

      {activeTab==='stats' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}>
          <Animated.View entering={FadeInDown.springify()}>
            <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, marginBottom:12 }}>📊 Overview</Text>
              <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
                <StatBadge label="Cards" value={cards.length} icon="cards" color={colors.primary} colors={colors} />
                <StatBadge label="Mastered" value={totalMastered} icon="check-circle" color="#10b981" colors={colors} />
                <StatBadge label="Streak" value="14d" icon="fire" color="#f59e0b" colors={colors} />
              </View>
              <View style={{ flexDirection:'row', gap:10 }}>
                <StatBadge label="Decks" value={decks.length} icon="folder-multiple" color="#8b5cf6" colors={colors} />
                <StatBadge label="Retention" value="84%" icon="brain" color="#06b6d4" colors={colors} />
                <StatBadge label="Reviews" value={247} icon="refresh" color="#ef4444" colors={colors} />
              </View>
            </View>

            <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, marginBottom:16 }}>📅 Weekly Activity</Text>
              <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6, height:80 }}>
                {[18,34,12,48,28,52,24].map((v,i) => {
                  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                  const isToday = i===6;
                  return (
                    <View key={i} style={{ flex:1, alignItems:'center', gap:4 }}>
                      <View style={{ width:'100%', height:(v/52)*64, borderRadius:6, backgroundColor:isToday ? colors.primary : colors.primarySoft }} />
                      <Text style={{ fontSize:9, color:isToday ? colors.primary : colors.textMuted, fontWeight:'700' }}>{days[i]}</Text>
                      <Text style={{ fontSize:9, color:colors.textMuted }}>{v}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ backgroundColor:colors.card, borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:colors.border }}>
              <Text style={{ fontSize:Colors.font.lg, fontWeight:'800', color:colors.text, marginBottom:14 }}>🎯 Deck Performance</Text>
              {decks.map(deck => {
                const dc = cards.filter(c=>c.deckId===deck.id);
                const ret = dc.length>0 ? Math.round((dc.filter(c=>c.difficulty==='easy'||c.difficulty==='good').length/dc.length)*100) : 0;
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

      {activeTab==='pomodoro' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}>
          <Animated.View entering={FadeIn} style={{ alignItems:'center' }}>
            <View style={{ flexDirection:'row', gap:8, marginBottom:24, width:'100%' }}>
              {([{ id:'focus', label:'Focus', mins:25 }, { id:'short', label:'Short Break', mins:5 }, { id:'long', label:'Long Break', mins:20 }] as { id:PomodoroMode; label:string; mins:number }[]).map(mode => (
                <TouchableOpacity key={mode.id} style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', backgroundColor:pomodoroMode===mode.id ? colors.primary : colors.inputBg }}
                  onPress={() => { setPomodoroMode(mode.id); setPomodoroTime(mode.mins*60); setPomodoroActive(false); pomodoroProgress.value=1; haptic.select(); }}>
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

            <View style={{ height:8, width:'80%', backgroundColor:colors.border, borderRadius:4, overflow:'hidden', marginBottom:24 }}>
              <Animated.View style={[{ height:'100%', backgroundColor:colors.primary, borderRadius:4 }, pomodoroBar]} />
            </View>

            <View style={{ flexDirection:'row', gap:12, marginBottom:24 }}>
              <TouchableOpacity style={{ backgroundColor:colors.inputBg, borderRadius:20, paddingHorizontal:20, paddingVertical:14, borderWidth:1, borderColor:colors.border }}
                onPress={() => { const t=pomodoroMode==='focus'?25*60:pomodoroMode==='short'?5*60:20*60; setPomodoroTime(t); setPomodoroActive(false); pomodoroProgress.value=withTiming(1); haptic.select(); }}>
                <MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor:pomodoroActive ? '#ef4444' : colors.primary, borderRadius:20, paddingHorizontal:48, paddingVertical:14 }}
                onPress={() => { setPomodoroActive(a=>!a); haptic.medium(); }}>
                <MaterialCommunityIcons name={pomodoroActive ? 'pause' : 'play'} size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor:colors.inputBg, borderRadius:20, paddingHorizontal:20, paddingVertical:14, borderWidth:1, borderColor:colors.border }}
                onPress={() => { setPomodoroSession(s=>s+1); haptic.select(); }}>
                <MaterialCommunityIcons name="skip-next" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection:'row', gap:10, width:'100%', backgroundColor:colors.card, borderRadius:20, padding:16, borderWidth:1, borderColor:colors.border }}>
              <StatBadge label={`Session ${pomodoroSession}/4`} value="🍅" icon="timer" color={colors.primary} colors={colors} />
              <StatBadge label="Completed" value={pomodoroTotal} icon="check-all" color="#10b981" colors={colors} />
              <StatBadge label="Focus Time" value={`${pomodoroTotal*25}m`} icon="clock" color="#f59e0b" colors={colors} />
            </View>
          </Animated.View>
        </ScrollView>
      )}

      <Modal visible={showCreateDeck} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }} onPress={() => setShowCreateDeck(false)}>
          <Pressable style={{ backgroundColor:colors.surface, borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:40 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:colors.border, alignSelf:'center', marginBottom:20 }} />
            <Text style={{ fontSize:Colors.font.xl, fontWeight:'800', color:colors.text, marginBottom:20 }}>New Deck</Text>
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:12, borderWidth:1, borderColor:colors.border }} placeholder="Deck name..." placeholderTextColor={colors.textMuted} value={newDeckName} onChangeText={setNewDeckName} />
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:16, borderWidth:1, borderColor:colors.border }} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={newDeckDesc} onChangeText={setNewDeckDesc} />
            <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.textSecondary, marginBottom:10 }}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
              <View style={{ flexDirection:'row', gap:8 }}>
                {DECK_EMOJIS.map(e => (
                  <TouchableOpacity key={e} style={{ width:44, height:44, borderRadius:12, backgroundColor:newDeckEmoji===e ? colors.primarySoft : colors.inputBg, alignItems:'center', justifyContent:'center', borderWidth:newDeckEmoji===e ? 2 : 0, borderColor:colors.primary }} onPress={() => setNewDeckEmoji(e)}>
                    <Text style={{ fontSize:24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.textSecondary, marginBottom:10 }}>Color</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {DECK_COLORS.map(c => <TouchableOpacity key={c} style={{ width:36, height:36, borderRadius:18, backgroundColor:c, borderWidth:newDeckColor===c ? 3 : 0, borderColor:'#fff' }} onPress={() => setNewDeckColor(c)} />)}
            </View>
            <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:14, padding:16, alignItems:'center' }} onPress={createDeck}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.base }}>Create Deck</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCreateCard} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }} onPress={() => setShowCreateCard(false)}>
          <Pressable style={{ backgroundColor:colors.surface, borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:40 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:colors.border, alignSelf:'center', marginBottom:20 }} />
            <Text style={{ fontSize:Colors.font.xl, fontWeight:'800', color:colors.text, marginBottom:20 }}>New Flashcard</Text>
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:12, borderWidth:1, borderColor:colors.border, minHeight:80, textAlignVertical:'top' }} placeholder="Front — question or term..." placeholderTextColor={colors.textMuted} value={newCardFront} onChangeText={setNewCardFront} multiline />
            <TextInput style={{ backgroundColor:colors.inputBg, borderRadius:14, padding:14, fontSize:Colors.font.base, color:colors.text, marginBottom:12, borderWidth:1, borderColor:colors.border, minHeight:80, textAlignVertical:'top' }} placeholder="Back — answer or definition..." placeholderTextColor={colors.textMuted} value={newCardBack} onChangeText={setNewCardBack} multiline />
            <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:colors.textSecondary, marginBottom:8 }}>Select Deck</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:20 }}>
              <View style={{ flexDirection:'row', gap:8 }}>
                {decks.map(d => (
                  <TouchableOpacity key={d.id} style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingVertical:10, borderRadius:12, backgroundColor:newCardDeck===d.id ? d.color : colors.inputBg, borderWidth:1, borderColor:newCardDeck===d.id ? d.color : colors.border }} onPress={() => setNewCardDeck(d.id)}>
                    <Text style={{ fontSize:16 }}>{d.emoji}</Text>
                    <Text style={{ fontSize:Colors.font.sm, fontWeight:'700', color:newCardDeck===d.id ? '#fff' : colors.text }}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={{ backgroundColor:colors.primary, borderRadius:14, padding:16, alignItems:'center' }} onPress={createCard}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:Colors.font.base }}>Add Flashcard</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
