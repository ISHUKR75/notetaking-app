# Ishu Notes — Study & Learning Tools

## Overview

Ishu Notes is not just a note-taking app — it's a complete **learning system**. With AI-generated flashcards, spaced repetition scheduling, quiz generation, Cornell Notes integration, and a dedicated Study Mode, students can go from raw notes to mastered material without ever leaving the app.

---

## Study Mode

### What is Study Mode?

Study Mode transforms any note into a distraction-free learning environment:

```
Normal View → Study Mode:
  ✅ Hides all UI chrome (sidebar, toolbar, menus)
  ✅ One sentence/paragraph highlighted at a time
  ✅ Reading guide line follows cursor
  ✅ Font size enlarged for comfortable reading
  ✅ Dyslexia-friendly font option
  ✅ Auto-scroll at reading speed
  ✅ Text-to-speech reads aloud as you follow
  ✅ Timer shows reading session duration
  ✅ Highlights faded (re-focus after each session)
```

### Study Mode UI

```
┌────────────────────────────────────────────────────────────────┐
│  Ishu Notes — Study Mode                       [Exit]  [⚙️]  │
│                                                                │
│  Introduction to Machine Learning                             │
│  ─────────────────────────────────────────────────────────── │
│                                                                │
│  Machine learning is a subset of artificial intelligence (AI) │
│  ══════════════════════════════════════════════════════════   │
│  that gives systems the ability to automatically learn and     │
│  improve from experience without being explicitly programmed.  │
│                                                                │
│  ─────────────────────────────────────────────────────────── │
│                                                                │
│  00:14:32                          Word 342/890   38% done    │
│  [◀ Back]   [▶▶ Auto-scroll: 180 wpm]   [Next section ▶]    │
│  [🔊 Read aloud]   [🔖 Bookmark]   [📝 Quick note]           │
└────────────────────────────────────────────────────────────────┘
```

---

## Cornell Notes System

### Cornell Template Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Title: Introduction to ML                  Date: June 22  │
├────────────────────────┬────────────────────────────────────┤
│                        │                                    │
│  CUE COLUMN            │  NOTES COLUMN                      │
│  (Questions/Keywords)  │  (Main notes during class/reading) │
│                        │                                    │
│  What is supervised    │  • Supervised learning uses        │
│  learning?             │    labeled training data           │
│                        │  • Algorithm learns to map         │
│  Key algorithms?       │    inputs → outputs                │
│                        │  • Examples: classification,       │
│  What is overfitting?  │    regression                      │
│                        │                                    │
│                        │  Key algorithms:                   │
│                        │  - Linear regression               │
│                        │  - Decision trees                  │
│                        │  - Neural networks                 │
│                        │                                    │
│  How to prevent        │  Overfitting: model memorizes      │
│  overfitting?          │  training data, fails on new data  │
│                        │  Prevention: regularization,       │
│                        │  cross-validation, dropout         │
│                        │                                    │
├────────────────────────┴────────────────────────────────────┤
│  SUMMARY                                                    │
│  Machine learning enables computers to learn from data.     │
│  Supervised learning uses labeled examples. Key challenge   │
│  is balancing model complexity to avoid overfitting.        │
└─────────────────────────────────────────────────────────────┘
```

### Cornell Mode Features
- Auto-populate summary using AI
- Auto-generate cue questions from notes column
- Cover right column (notes) — use left column (cues) for self-testing
- Cover left column — recall cues from notes
- Export in Cornell format PDF

---

## Flashcard System

### Flashcard Creation

**Method 1 — AI Auto-Generate:**
```
In any note → [🤖 AI] → [Generate Flashcards]

Options:
  Count: [5 / 10 / 20 / 50 / All]
  Type:
    ○ Question & Answer
    ○ Term & Definition
    ○ Fill in the Blank
    ● Multiple Choice
  Difficulty:
    ○ Easy    ● Medium    ○ Hard    ○ Mixed
  Language: [Same as note ▼]

[Generate]
```

**Method 2 — Manual Create:**
```
Select text in note → [✨ Make Flashcard]
→ Creates card with selection as Answer
→ User fills in Question/Term

OR

Highlight word → [Define] → Auto-creates term/definition card
using built-in dictionary or AI definition
```

**Method 3 — Cloze Deletion:**
```
Select text in note → [Insert cloze]
"Machine learning is a {{subset}} of artificial intelligence"
                              ↑ 
                      Blanked out on card front
                      Shows on card back
```

### Flashcard Deck UI

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Machine Learning Basics Deck            8 / 24 cards       │
│  Progress: [████████░░░░░░░░░░░░░░░] 33%                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌───────────────────────────┐               │
│                    │                           │               │
│                    │   What is overfitting?    │  FRONT        │
│                    │                           │               │
│                    │                           │               │
│                    │   [Tap to reveal ▼]       │               │
│                    │                           │               │
│                    └───────────────────────────┘               │
│                                                                 │
│                    [← Swipe: Forgot]  [Swipe: Got it →]       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Rating: [😣 Hard] [😐 Good] [😊 Easy] [🎯 Perfect]           │
└─────────────────────────────────────────────────────────────────┘
```

After tapping to reveal:
```
┌───────────────────────────────────┐
│                                   │
│  What is overfitting?             │  BACK
│  ─────────────────────────────   │
│                                   │
│  When a model learns the training │
│  data too well — memorizing noise │
│  and details — causing it to      │
│  perform poorly on new, unseen    │
│  data.                            │
│                                   │
│  [Source note: Ch. 3, Page 2 ↗] │
└───────────────────────────────────┘
```

---

## Spaced Repetition (SM-2 Algorithm)

### How It Works

Cards are scheduled for review based on how well you know them:
- Rate card as Easy → next review: 8 days
- Rate card as Good → next review: 4 days
- Rate card as Hard → next review: tomorrow
- Rate card as Again → review: in 10 minutes

### Review Schedule View

```
Review Calendar:
┌─────────────────────────────────────────────────────────────┐
│  June 2026                                                  │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                          │
│   22   23   24   25   26   27   28                          │
│  [12]  [5]  [8]  [0]  [15]  [3]  [0]                       │
│                                                              │
│  Today: 12 cards due                                        │
│  This week: 43 cards due                                    │
│  Total learned: 247 / 312 cards                             │
└─────────────────────────────────────────────────────────────┘

[Start Today's Review — 12 cards] (estimated 8 min)
```

### Stats & Retention

```
📊 Deck Statistics — Machine Learning Basics:

  Cards: 24 total | 18 learning | 6 new
  Retention rate: 87%          (target: 80%+)
  Avg ease factor: 2.45
  
  Review history (last 30 days):
  [Bar chart: daily reviews]

  Difficulty breakdown:
  ████████░░  Easy   (42%)
  ████░░░░░░  Good   (35%)
  ██░░░░░░░░  Hard   (23%)
```

---

## Quiz Generator

### AI Quiz Generation

```
Generate Quiz from: "Chapter 5 — Neural Networks"

Quiz Type:
  ● Multiple Choice (4 options)
  ○ True / False
  ○ Short Answer
  ○ Fill in the Blank
  ○ Mixed (all types)

Questions: [10]
Difficulty: [Medium ▼]
Language: [English ▼]

[Generate Quiz]
```

### Quiz Taking UI

```
┌────────────────────────────────────────────────────────────────┐
│  Quiz: Neural Networks    Question 3 of 10      ⏱ 4:32       │
│  Progress: [██████░░░░░░░░░░░░░░]                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  3. Which activation function outputs values between 0 and 1? │
│                                                                │
│    A) ReLU                                                     │
│    B) Tanh                                                     │
│  ● C) Sigmoid                          ← User selected        │
│    D) Linear                                                   │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  [← Previous]                              [Next Answer →]    │
└────────────────────────────────────────────────────────────────┘
```

### Quiz Results

```
┌────────────────────────────────────────────────────────────────┐
│  🎉 Quiz Complete!                                             │
│                                                                │
│   8 / 10   Correct     (80%)                                  │
│                                                                │
│  [██████████████████░░░░]                                     │
│                                                                │
│  ✅ Correct (8):                                               │
│     Q1, Q2, Q3, Q4, Q5, Q7, Q9, Q10                          │
│                                                                │
│  ❌ Incorrect (2):                                             │
│     Q6 — Backpropagation formula                               │
│           Your answer: Gradient Ascent                         │
│           Correct: Gradient Descent                            │
│                                                                │
│     Q8 — LSTM vs GRU difference                               │
│           Your answer: No difference                           │
│           Correct: GRU has fewer parameters                    │
│                                                                │
│  [Review incorrect]  [Create flashcards from wrong]  [Retake]  │
└────────────────────────────────────────────────────────────────┘
```

---

## Mind Map View

Convert a note into a visual mind map:

```
Settings → View → Mind Map

                    [Machine Learning]
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   [Supervised]    [Unsupervised]    [Reinforcement]
       │                   │                 │
  ┌────┴────┐        ┌─────┴────┐      [Agent]
  │         │        │          │      [Environment]
[Regression] [Classification] [Clustering] [Reward]
  │         │
[Linear]  [Logistic]
```

- Drag nodes to rearrange
- Click node → Opens linked note section
- Collapse/expand branches
- Export as PNG, SVG, or PDF
- Share as interactive HTML

---

## Pomodoro Timer (Built-In)

Integrated study timer for focused sessions:

```
┌──────────────────────────────────────────────┐
│  🍅 Pomodoro Timer                           │
│                                              │
│         24:58                               │
│  [Focus Session 3 of 4]                    │
│                                              │
│  ████████████████████░░░░░  83%             │
│                                              │
│  [⏸ Pause]  [⏭ Skip]  [⚙️ Settings]       │
│                                              │
│  After this: 5 min break                    │
│  After 4 sessions: 20 min long break        │
└──────────────────────────────────────────────┘
```

Settings:
- Focus: 25 min (default) / 30 / 45 / 50 / 60 / Custom
- Short break: 5 min / 10 min / Custom
- Long break: 15 / 20 / 30 min / Custom
- Sessions before long break: 4 (default)
- Auto-start next session: On/Off
- Sound: Bell / Chime / Digital / Silent

---

## Study Statistics Dashboard

```
📊 Study Dashboard — June 2026

STREAK: 🔥 14 days
TODAY: 45 min studied | 28 cards reviewed
THIS WEEK: 4.2 hours | 156 cards

Cards by Status:
  New      [█░░░░░░░░░] 48
  Learning [████░░░░░░] 156
  Review   [██████████] 312
  Mastered [████████░░] 284

Time spent by notebook:
  📓 Machine Learning   ████████  3.2 hrs
  📓 Math Chapter 5     ████      1.8 hrs
  📓 Chemistry          ███       1.2 hrs

Retention by deck:
  ML Basics       94% ✅
  Neural Networks 78% ⚠️
  Math Formulas   65% ❌

[Export study report]   [Share progress]
```
