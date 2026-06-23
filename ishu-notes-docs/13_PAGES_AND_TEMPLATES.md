# Ishu Notes — Pages System & Template Library

## Overview

Ishu Notes uses a multi-page notebook system inspired by GoodNotes 6 and Apple Notes, with 100+ built-in templates and a powerful custom template creator.

---

## Page System

### Page Types

#### 1. Rich Text Page (Default)
- TipTap block-based editor
- All text formatting, tables, embeds
- Inline images and media
- Handwriting canvas embedded anywhere via `/draw` block

#### 2. Full Canvas Page
- Entire page is a drawing canvas
- Template background (lines, dots, grid, etc.)
- Unlimited handwriting space
- No text editor — pure canvas
- Like a physical notebook page

#### 3. Mixed Page (Samsung Notes-style)
- Split into zones: handwriting + typed text
- Drag zone boundary to resize
- Seamlessly switch between writing and typing
- Best for: lecture notes, meeting notes

#### 4. Voice Note Page
- Large recording button
- Waveform visualization during recording
- Transcription shown alongside audio
- Add notes while recording
- Audio bookmarks (tap to mark important moments)

#### 5. PDF Page (Annotatable)
- Import PDF → displays as page background
- Draw/write on top in annotation layer
- Highlight PDF text
- Add typed text boxes
- Page-by-page navigation

#### 6. Web Clip Page
- Clipped webpage displayed with original styling
- Annotation overlay
- Highlight any text in the clip
- Add notes alongside

#### 7. Database Page
- Notion-style database
- All view types (table, board, gallery, etc.)
- Properties and relationships
- Filters and sorts

---

## Page Navigation

### Page Mini-Map
Right side of canvas: Miniature overview of all pages
- Drag to scroll through pages
- Click to jump to any page
- Current page highlighted
- Visible in both paginated and continuous view

### Page Thumbnails View
```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Page 1 │ │ Page 2 │ │ Page 3 │ │ Page 4 │
│ [thumb]│ │ [thumb]│ │ [thumb]│ │ + Add  │
│        │ │        │ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘
```
- Tap to open page
- Long press → page options
- Drag to reorder
- Multi-select for bulk operations

### Page Management Operations
- Add page (before/after current, at end)
- Duplicate page
- Delete page (with undo)
- Move page to different section
- Move page to different notebook
- Copy page content to clipboard
- Merge with adjacent page
- Split long page into two
- Rotate page 90°/180°
- Resize page (change from A4 to Letter, etc.)

---

## Template System

### Template Categories (100+ Templates)

#### Writing Templates
| Template | Description | Grid Type |
|----------|-------------|-----------|
| Blank | Pure white page | None |
| Wide Ruled | 8mm line spacing | Horizontal lines |
| Narrow Ruled | 5mm line spacing | Horizontal lines |
| College Ruled | Standard ruled | Horizontal + margin |
| Wide College Ruled | Accessibility version | Extra wide lines |
| Left Margin | Ruled with left margin | Lines + margin |
| Double Margin | Both margins for notes | Lines + 2 margins |
| Feint Ruled | Light guide lines | Very faint lines |
| Primary Lines | For beginners/kids | Thick lines |

#### Grid/Math Templates
| Template | Description |
|----------|-------------|
| Dot Grid (5mm) | Dots every 5mm |
| Dot Grid (3.5mm) | Dense dot grid |
| Square Grid (5mm) | Standard graph paper |
| Square Grid (2mm) | Fine graph paper |
| Square Grid (10mm) | Large square grid |
| Isometric Grid | Triangle-based for 3D |
| Hexagonal Grid | Honeycomb pattern |
| Log-Log Grid | Logarithmic graph |
| Semi-Log Grid | One log axis |
| Polar Grid | Circular grid |
| Triangular Grid | Triangle subdivisions |
| Engineering Paper | Standard 5:1 ratio |

#### Planning Templates
| Template | Description |
|----------|-------------|
| Daily Planner | Hour-by-hour daily schedule |
| Weekly Planner | 7-day week overview |
| Monthly Calendar | Full month calendar |
| Yearly Overview | 12-month year at a glance |
| Habit Tracker (Monthly) | 31-day checkbox grid |
| Habit Tracker (Weekly) | 7-day habit grid |
| Meal Planner | Weekly meal + shopping list |
| Budget Tracker | Income, expenses, balance |
| Goal Setting | OKR-style goal template |
| Project Planner | Gantt-lite template |
| Meeting Notes | Agenda, notes, action items |
| Agenda | Bullet agenda format |
| Reading Tracker | Book list with ratings |
| Travel Planner | Trip itinerary template |

#### Learning Templates
| Template | Description |
|----------|-------------|
| Cornell Notes | 3-zone: notes, cues, summary |
| Mind Map Blank | Central circle with branches |
| Concept Map | Box-and-arrow concept template |
| Flashcard (Front) | Large card face |
| Flashcard (Back) | Card answer side |
| Study Guide | Topic outline with notes area |
| Timeline | Horizontal timeline template |
| Comparison Chart | Side-by-side comparison |
| Vocabulary Sheet | Word, definition, example |
| Math Problem Set | Problem number + work area |
| Essay Outline | Introduction → Body → Conclusion |
| Research Notes | Source + notes + citation |
| Lab Report | Hypothesis, method, results, conclusion |

#### Art Templates
| Template | Description |
|----------|-------------|
| Watercolor Guide | Wet/dry area marked |
| Figure Proportion | Human body proportion guide |
| 1-Point Perspective | Vanishing point guide |
| 2-Point Perspective | Two vanishing points |
| Storyboard (4 panels) | 4-panel comic/film boards |
| Storyboard (6 panels) | 6-panel format |
| Storyboard (8 panels) | 8-panel format |
| Character Sheet | Character design template |
| Architectural Grid | Building plan grid |
| Fashion Croquis | Fashion figure template |
| Mandala Guide | Circular mandala construction |

#### Music Templates
| Template | Description |
|----------|-------------|
| Treble Clef Staff | Standard 5-line treble staff |
| Bass Clef Staff | Bass staff paper |
| Grand Staff | Piano staff (treble + bass) |
| Guitar Tablature | 6-line guitar tab |
| Drum Tab | Percussion notation |
| Chord Chart | Guitar chord diagram template |
| Lead Sheet | Melody + chord symbols |
| Chord Progression | Harmonic progression template |

#### Business Templates
| Template | Description |
|----------|-------------|
| SWOT Analysis | Strengths, Weaknesses, Opportunities, Threats |
| Business Model Canvas | 9-block Osterwalder canvas |
| User Story | Agile user story format |
| Sprint Retrospective | What went well/badly/try |
| Customer Journey Map | Stages + touchpoints + emotion |
| Empathy Map | Says, Thinks, Feels, Does |
| Value Proposition Canvas | Product/Customer fit template |
| Project Brief | Project scope template |
| Invoice Template | Simple invoice layout |
| Meeting Agenda | Formal meeting format |

---

## Template Page Sizes

| Size Name | Dimensions (Portrait) | Common Use |
|-----------|----------------------|------------|
| A4 | 210mm × 297mm | International standard |
| A5 | 148mm × 210mm | Compact notebooks |
| A3 | 297mm × 420mm | Large format work |
| A6 | 105mm × 148mm | Pocket notes |
| US Letter | 216mm × 279mm | North America |
| US Legal | 216mm × 356mm | Legal documents |
| US Tabloid | 279mm × 432mm | Large format US |
| Custom | User-defined | Any use case |

---

## Custom Template Creator

### Template Creation Process

**Step 1: Choose Base**
- Start from blank
- Start from existing template
- Import image as background

**Step 2: Design Tool**
```
Template Editor:
┌────────────────────────────────────────────────────────┐
│ TOOLS: [Line][Box][Circle][Text][Import Image]        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │           [Template Canvas]                      │ │
│  │                                                  │ │
│  │   (All elements placed here appear as the        │ │
│  │    non-interactive background on every page      │ │
│  │    using this template)                          │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│ SETTINGS: [Page Size ▼] [Color ▼] [Opacity ▼]        │
│           [Repeat Pattern] [Lock to Grid]              │
│                                                        │
│ [Preview] ──────────────── [Save Template →]          │
└────────────────────────────────────────────────────────┘
```

**Step 3: Configure**
- Name the template
- Choose category
- Add thumbnail description
- Set default page size
- Set as private or share to community

**Step 4: Share (Optional)**
- Share to Ishu Notes Template Gallery
- Set free or paid price
- Track usage count
- Get ratings and reviews

---

## Template Gallery (Community)

### Gallery Features
- Browse 1,000+ community templates
- Search by name, category, style
- Preview before installing
- One-click install
- Rate and review
- Follow template creators
- "Featured" and "Trending" sections
- My Installed Templates management

### Template Submission Guidelines
- Must be original work
- Must be properly categorized
- Must include preview thumbnail
- Free templates: Unlimited
- Paid templates: Premium feature (revenue share)

---

## Dynamic Templates (Smart Pages)

Templates that include interactive elements:

### Daily Dashboard Template
```
📅 [Today's Date — Auto-filled]

🎯 Top 3 Priorities:
  1. ________________
  2. ________________
  3. ________________

📋 Task List:             📝 Notes:
  ☐ ___________          ___________________
  ☐ ___________          ___________________
  ☐ ___________          ___________________

💭 Thought of the Day: [AI Quote — Auto-filled]
🌤 Weather: [Auto-filled via location]

📊 Habit Tracker:
  💧 Water   [○○○○○○○○] 
  🏃 Exercise [○○○○○○○]
  📚 Read    [○○○○○○○]
```

### Weekly Review Template
```
📅 Week of [Auto-filled]

✅ Wins This Week:         ❌ Challenges:
  ____________________    ___________________

📈 Progress on Goals:
  Goal 1: [Progress bar]  XX%
  Goal 2: [Progress bar]  XX%

🔮 Next Week Focus:
  ____________________

🌟 Gratitude (3 things):
  1. ___________________
  2. ___________________
  3. ___________________

💡 Lesson Learned:
  ____________________
```

### Meeting Notes Template
```
📅 Date: [Auto-filled]   ⏰ Time: _____ → _____
📍 Location/Link: _______________________
👥 Attendees: ___________________________

🎯 Meeting Goal:
  _______________________________________

📋 Agenda:
  1. _____ (__ min)
  2. _____ (__ min)
  3. _____ (__ min)

📝 Discussion Notes:
  ____________________________________________
  ____________________________________________

✅ Action Items:
  ☐ [WHO]: [WHAT] by [WHEN]
  ☐ [WHO]: [WHAT] by [WHEN]

📅 Next Meeting: _______________________
```
