# Design Guidelines: Parent Reading Tracker + Mastery Flashcards

## Design Approach
**Selected System:** Material Design 3 (Material You)
**Rationale:** Mobile-first educational tool requiring clear visual feedback, touch-optimized interactions, and information density. Material Design provides robust patterns for forms, data visualization, and card-based layouts essential for session tracking and flashcard interfaces.

**Core Principles:**
- Mobile-first, touch-optimized (Kindle Fire tablet primary device)
- Immediate visual feedback for all interactions
- Clear information hierarchy for quick parent scanning
- Distraction-free learning environment for children
- Accessibility for varying literacy levels

---

## Typography

**Font Family:** 
- Primary: Inter (via Google Fonts CDN)
- Fallback: system-ui, sans-serif

**Type Scale:**
- Headlines (Screen titles): `text-2xl` / `font-bold` (24px)
- Section headers: `text-xl` / `font-semibold` (20px)
- Body text: `text-base` / `font-normal` (16px)
- Labels/metadata: `text-sm` / `font-medium` (14px)
- Flashcard words (large display): `text-6xl` / `font-bold` (60px)

**Hierarchy Rules:**
- Screen titles always at top with consistent spacing
- Section headers introduce content blocks
- Body text maintains 1.6 line height for readability
- All interactive text (buttons, links) use `font-medium` for emphasis

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 4, 8, 12, 16**
- Component padding: `p-4` (16px) for cards, `p-6` (24px) for sections
- Stack spacing: `space-y-4` for related items, `space-y-8` for sections
- Touch targets: minimum `h-12` (48px) for all buttons and tappable areas
- Container margins: `mx-4` on mobile, `mx-auto max-w-4xl` on tablet

**Grid Patterns:**
- Child profile cards: `grid grid-cols-1 gap-4` (single column on mobile)
- Word library list: Full-width cards with `space-y-2`
- Session insights: `grid grid-cols-2 gap-4` for stat pairs
- Settings toggles: Full-width rows with `space-y-4`

**Mobile-First Breakpoints:**
- Base (mobile): 320px+
- Tablet: `md:` breakpoint for Kindle Fire optimization
- Desktop: `lg:` for larger screens (max-width constraints apply)

---

## Component Library

### Navigation
- **Top App Bar:** Sticky header with back button (left), screen title (center), action icons (right), `h-14` height, subtle bottom border
- **Bottom Nav (if multi-section):** Fixed bottom bar with icons + labels, `h-16`, active state with filled icon

### Cards
- **Session Cards:** Rounded corners `rounded-lg`, `p-4`, subtle shadow `shadow-sm`, border `border`, contain: book title, date, word count, "View Details" link
- **Word Cards:** Full-width rows, `p-3`, contain: word (left, bold), status badge (right), tap to expand for stats (occurrences, dates)
- **Child Profile Cards:** Larger `p-6`, includes child name, grade level, vocabulary count, "Select" button

### Forms
- **Image Upload Zone:** Large dropzone `min-h-48`, dashed border `border-2 border-dashed`, centered icon + text "Tap to upload pages", shows thumbnail grid after upload
- **Text Inputs:** Full-width, `h-12`, `px-4`, rounded `rounded-md`, border, clear labels above
- **Toggle Switches:** Material Design switches with label (left) and switch (right), `h-12` row height

### Flashcard Interface
- **Card Display:** Centered full-screen card, `min-h-96`, massive text `text-6xl`, word centered vertically and horizontally
- **Action Buttons:** Bottom-fixed dual buttons, equal width split (50/50), `h-16` each, ✓ (left), ✗ (right), no icons needed - clear text labels "Correct" and "Incorrect"
- **Progress Indicator:** Top bar showing "7/10" count, subtle progress bar

### Data Displays
- **Stat Blocks:** Two-column grid on mobile, each block shows number (large, `text-3xl font-bold`) and label (small, `text-sm`)
- **Word List:** Filterable/sortable table-like rows, each word is a tappable row with: word, status badge, frequency count
- **Session History:** Timeline-style list, newest first, date headers for grouping

### Buttons
- **Primary CTA:** Full-width on mobile `w-full`, `h-12`, `rounded-lg`, solid fill, `font-semibold`
- **Secondary:** Outlined variant, same dimensions
- **Icon Buttons:** Square `w-12 h-12`, rounded `rounded-full`, centered icon

### Status Badges
- **New:** Small pill `px-3 py-1`, `rounded-full`, `text-xs font-medium`
- **Learning:** Same treatment, different visual weight
- **Mastered:** Same treatment, celebratory feel

---

## Images

**Strategy:** Minimal, functional imagery only

**Image Usage:**
- **Empty States:** Illustrations for "No sessions yet", "No words in library" - simple line illustrations, centered, `max-w-xs`
- **Upload Preview:** Thumbnail grid of uploaded page images, `grid grid-cols-3 gap-2`, each thumbnail `aspect-square rounded-md`

**No hero images** - This is a utility application focused on functionality. All screens prioritize content and actions over decorative imagery.

---

## Interaction Patterns

**Flashcard Gestures:**
- Large tap targets for ✓/✗ buttons (bottom half of screen)
- Instant visual feedback on tap (brief scale animation)
- Auto-advance to next card after selection (0.3s delay)

**List Interactions:**
- Tap word card to expand details (slide-down reveal)
- Swipe actions NOT used (avoid accidental deletions)
- Pull-to-refresh on session history

**Form Validation:**
- Inline error messages below inputs
- Disabled button states when form incomplete
- Success confirmation toasts after saves

---

## Key Screens Layout

1. **Child Select:** Grid of child profile cards, FAB for "+ Add Child"
2. **Upload Session:** Large dropzone at top, optional book name input, "Process Pages" button at bottom
3. **Session Insights:** Stats grid (new words, total words), expandable "New Words List", link to start flashcards
4. **Flashcards:** Full-screen card with word, bottom action buttons, top progress bar
5. **Word Library:** Search bar, filter chips (new/learning/mastered), scrollable word list
6. **History Test:** "Generate Test" button, size selector (10/20/30 words), start button
7. **Settings:** List of toggle rows, save button at bottom