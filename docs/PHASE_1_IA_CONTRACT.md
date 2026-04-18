# Phase 1: Sidebar IA and Interaction Contract

## Overview

Replace the current `ConversationRail` with a non-tech unified sidebar that shows datasets and their conversations in a nested tree structure. Primary actions (New Chat, Upload Dataset, Switch Dataset) are prominently visible. No rename/delete conversation actions for this release.

## Component Hierarchy

```
<NonTechSidebar onNavigate={closeDrawer}>
  ├─ <SidebarHeaderActions>
  │   ├─ New Chat CTA (primary button)
  │   ├─ Upload Dataset CTA (secondary button)  
  │   └─ Dataset Switcher Dropdown (if multiple datasets)
  │
  ├─ <DatasetTree>
  │   ├─ <DatasetNode> (dataset1 - expanded by default if active)
  │   │   ├─ Dataset name + metadata
  │   │   ├─ Expand/Collapse chevron
  │   │   └─ <ChatNodeList>
  │   │       ├─ <ChatNode> (recent chat)
  │   │       ├─ <ChatNode> (older chat)
  │   │       └─ "Start with a question" CTA (if no chats)
  │   │
  │   └─ <DatasetNode> (dataset2 - collapsed)
  │       ├─ Dataset name + metadata
  │       ├─ Expand/Collapse chevron
  │       └─ <ChatNodeList> (only rendered when expanded)
  │
  └─ <SidebarEmptyState>
      └─ "Upload a CSV to begin" (only if no datasets exist)
```

## Component Props & Responsibilities

### `<NonTechSidebar />`
**Props:**
```typescript
interface NonTechSidebarProps {
  onNavigate?: () => void; // Call when user selects dataset/chat (closes mobile drawer)
}
```

**Responsibilities:**
- Render header actions (New Chat, Upload Dataset, optional switcher)
- Render nested tree of datasets + chats
- Handle loading/error states for dataset list
- Call `onNavigate` when user selects dataset, chat, or creates new chat
- Show empty state when no datasets exist

**Internal State (via hooks):**
- `useDatasets()` — for dataset list, active dataset, set active dataset, refresh
- `useConversation()` — for active conversation, create new, refresh
- `useUploadModal()` — to trigger upload modal open
- `expandedDatasetIds` — local state tracking which datasets are expanded (Set<string>)

---

### `<SidebarHeaderActions />`
**Props:**
```typescript
interface SidebarHeaderActionsProps {
  onNewChat: () => void; // Create new conversation under active dataset
  onUpload: () => void; // Open upload modal
  datasets: Dataset[]; // List of all datasets
  activeDataset: Dataset | null; // Currently selected dataset
  onSwitchDataset: (dataset: Dataset) => void; // Set active dataset
  isCreatingChat: boolean; // Disable New Chat button while loading
}
```

**Responsibilities:**
- Render "New Chat" primary CTA (disabled if no active dataset)
- Render "Upload Dataset" secondary CTA
- Render dataset switcher dropdown if multiple datasets exist (optional for Phase 1, can be implicit via tree)
- Disable/show loading state while creating new chat
- Tooltip help text: "New Chat creates a new conversation under [Active Dataset]"

**Styling:**
- Buttons: Full-width, stacked vertically, brand-indigo for primary, outlined for secondary
- Padding: `px-4 py-3` container, `gap-2` between buttons
- Border: Bottom divider line with subtle border

---

### `<DatasetTree />`
**Props:**
```typescript
interface DatasetTreeProps {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  expandedDatasetIds: Set<string>;
  onToggleExpand: (datasetId: string) => void;
  onSelectDataset: (dataset: Dataset) => void;
  conversationsByDataset: Map<string, Conversation[]>; // Pre-fetched chats per dataset
  loadingDatasetIds: Set<string>; // Which datasets are loading chats
  errorsByDataset: Map<string, string>; // Errors per dataset
  onRetryDataset: (datasetId: string) => void;
  onSelectChat: (conversation: Conversation, datasetId: string) => void;
  activeConversation: Conversation | null;
  isCreatingChat: boolean;
}
```

**Responsibilities:**
- Render list of `<DatasetNode>` components
- Show loading/error states for each dataset's chat list independently
- Handle expand/collapse of each dataset
- Track and restore expanded state (persist to sessionStorage for UX consistency)
- Manage per-dataset chat loading (lazy load on expand, cache by datasetId)

**Styling:**
- Container: `flex-1 overflow-y-auto` with subtle scrollbar
- Padding: `py-2` container
- No border between dataset nodes (subtle spacing only)

---

### `<DatasetNode />`
**Props:**
```typescript
interface DatasetNodeProps {
  dataset: Dataset;
  isActive: boolean; // Is this the currently selected dataset
  isExpanded: boolean; // Is this node expanded to show chats
  onToggle: () => void; // Toggle expand/collapse
  onSelect: () => void; // Set this dataset as active
  chats: Conversation[] | null; // Chats for this dataset (null if not fetched yet)
  isLoading: boolean; // Loading chats for this dataset
  error: string | null; // Error loading chats for this dataset
  onRetry: () => void; // Retry loading chats for this dataset
  onSelectChat: (conversation: Conversation) => void;
  activeConversation: Conversation | null;
  isCreatingChat: boolean;
}
```

**Responsibilities:**
- Render dataset row (name, row/col count badges, expand/collapse chevron)
- Show active state visual indicator (highlighted background or accent)
- On click: set dataset as active AND expand (if not already expanded)
- If expanded and chats are available, render `<ChatNodeList>`
- If expanded and loading, show skeleton placeholders
- If expanded and error, show error message + retry button
- If expanded but no chats exist, show "Start with a question" prompt

**Interaction Rules:**
- **Click row:** If dataset is inactive, set active + expand. If already active, just toggle expand.
- **Expand without chats:** Trigger lazy-load of chats for this dataset (sets `loadingDatasetIds`)
- **Loading chats:** Show 3 skeleton items while fetching

**Styling:**
- Row: `px-3 py-2.5 rounded-lg mx-1` with hover/active states
- Active state: `bg-brand-indigo/15` background
- Chevron: Rotate 90° when expanded
- Font: `text-sm font-medium` for dataset name
- Badges: `text-[10px]` text-slate-500 for row/col counts

**Example Layout:**
```
[▼] Dataset Name (123 rows × 45 cols)
  ├─ Chat 1 Title (2d ago)
  ├─ Chat 2 Title (5d ago)
  └─ "Start new question" CTA
```

---

### `<ChatNodeList />`
**Props:**
```typescript
interface ChatNodeListProps {
  chats: Conversation[];
  activeConversation: Conversation | null;
  onSelectChat: (conversation: Conversation) => void;
  datasetId: string;
  isCreatingChat: boolean;
  showEmptyPrompt?: boolean; // Show "Start with a question" if no chats
  onStartNewChat?: () => void; // Trigger new chat creation under this dataset
}
```

**Responsibilities:**
- Render list of `<ChatNode>` components for this dataset
- Show "Start with a question" prompt if no chats and `showEmptyPrompt=true`
- Pass through active conversation and selection handler to child nodes

**Styling:**
- Container: `space-y-0.5 px-2 py-1` (nested under dataset node)

---

### `<ChatNode />`
**Props:**
```typescript
interface ChatNodeProps {
  conversation: Conversation;
  isActive: boolean; // Is this the currently selected conversation
  onClick: () => void; // Select this conversation
  showRelativeTime: boolean; // Show "2d ago" vs just title
}
```

**Responsibilities:**
- Render chat row (truncated title, optional relative time)
- Show active state visual (highlight or accent)
- Call `onClick` when selected
- On click: set active conversation and navigate to route
- Trigger `onNavigate` callback to close mobile drawer

**Styling:**
- Row: `px-3 py-2 rounded-lg ml-4 text-sm` (indented under dataset)
- Active state: `bg-brand-indigo/20` or `text-brand-indigo` accent
- Hover state: `hover:bg-white/5`
- Font: `text-sm` with truncation
- Relative time: `text-[11px] text-slate-500` to the right of title

**Example:**
```
  Chat: "Revenue by region" (2d ago)
  [active] Chat: "Q1 expenses" (5d ago)
  Chat: "2024 projections" (1w ago)
```

---

### `<SidebarEmptyState />`
**Props:**
```typescript
interface SidebarEmptyStateProps {
  onUpload: () => void; // Open upload modal
}
```

**Responsibilities:**
- Show upload-first prompt when no datasets exist
- Render large upload CTA
- Show icon + helper text

**Styling:**
- Container: Centered, `flex flex-col items-center justify-center h-full`
- Icon: Large SVG upload icon
- Text: "No datasets yet", "Upload a CSV to begin"
- CTA: Primary button "Upload Dataset"

---

### `<SidebarErrorState />`
**Props:**
```typescript
interface SidebarErrorStateProps {
  error: string;
  onRetry: () => void;
}
```

**Responsibilities:**
- Show error message when dataset list fails to load
- Provide retry button

**Styling:**
- Container: Red-tinted error box with border
- Icon: Warning triangle
- Message: Error text + "Try again" link

---

## State Management Contract

### Hook Integration (useDatasets)
```typescript
const { datasets, activeDataset, setActiveDataset, refreshDatasets, isLoading, error } = useDatasets();
```

**Expected values:**
- `datasets`: Ordered list of Dataset objects (loaded once on mount)
- `activeDataset`: Currently selected Dataset or null
- `setActiveDataset(dataset)`: Set active dataset and persist to sessionStorage
- `refreshDatasets()`: Refetch dataset list (after upload)
- `isLoading`: Boolean for top-level datasets loading
- `error`: String error message or null

**New hook calls needed:**
- `useDatasetConversations(datasetId)` — Lazy-load and cache chats per dataset (Phase 2)

### Hook Integration (useConversation)
```typescript
const { activeConversation, setActiveConversation, createNewConversation, isLoading, error } = useConversation();
```

**Expected values:**
- `activeConversation`: Currently selected Conversation or null
- `setActiveConversation(conv)`: Set active conversation and navigate
- `createNewConversation()`: Create new chat under active dataset
- `isLoading`: Boolean for creation in progress
- `error`: String error message or null

### Hook Integration (useUploadModal)
```typescript
const { openUploadModal } = useUploadModal();
```

**Expected values:**
- `openUploadModal()`: Trigger upload modal; sidebar should listen for upload completion and refresh datasets

---

## Empty / Loading / Error States

### No Datasets (Empty State)
```
┌─────────────────────────────────────┐
│        📤 Upload a Dataset          │
│                                      │
│   No datasets yet. Upload a CSV     │
│   or choose from our sample data    │
│           [Upload Dataset]          │
└─────────────────────────────────────┘
```

**UI:**
- Show `<SidebarEmptyState />`
- Disable "New Chat" CTA (no active dataset)
- Upload CTA remains enabled

---

### Datasets Exist, No Chats Under Active Dataset (Create-First State)
```
[🔄] New Chat  [⬆] Upload Dataset

▼ Marketing Data (50 rows × 12 cols)
    Start with a question...
    [What's the top campaign?]

⊟ Sales Data (100 rows × 8 cols)
```

**UI:**
- Dataset is expanded, but chat list is empty
- Show a "Start with a question" prompt or starter question chips
- New Chat CTA remains enabled

---

### Dataset Chat Loading (Lazy Load on Expand)
```
▼ Marketing Data (50 rows × 12 cols)
    ⊙ Loading...
    ⊙ Loading...
    ⊙ Loading...

⊟ Sales Data (100 rows × 8 cols)
```

**UI:**
- Show 3 skeleton placeholders while chats are being fetched
- Non-blocking (user can still interact with other datasets)

---

### Dataset Chat Load Failure (Error State)
```
▼ Marketing Data (50 rows × 12 cols)
    ⚠️  Failed to load chats
    [Retry]

⊟ Sales Data (100 rows × 8 cols)
```

**UI:**
- Show error box with retry button under that dataset node
- Other datasets remain interactive
- Clicking retry refetches chats for that specific dataset

---

### Creating New Chat (Pending State)
```
[🔄] New Chat  [⬆] Upload Dataset
     (disabled, loading)

▼ Marketing Data (50 rows × 12 cols)
    ⟳ Chat: "New Conversation" (new)
    Chat: "Top campaigns" (2d ago)
```

**UI:**
- "New Chat" button shows loading spinner and is disabled
- Placeholder chat row appears at top with a "new" badge or loading indicator
- Once created, navigates to that conversation

---

## User Flows

### Flow 1: Select Active Dataset
1. User sees dataset tree with multiple datasets
2. Clicks on dataset row (e.g., "Marketing Data")
3. Dataset becomes active (visual highlight, sessionStorage persisted)
4. Dataset expands to show its chats (if not already expanded)
5. If mobile: drawer closes automatically

**Sidebar State:**
- Dataset row: Active highlight
- Chat list: Rendered and visible
- Expand chevron: Pointing down

---

### Flow 2: Select Conversation
1. User clicks on a chat row (e.g., "Top campaigns")
2. That conversation becomes active (visual highlight)
3. Route changes to `/app/[conversationId]`
4. Chat messages load in main area
5. If mobile: drawer closes automatically

**Sidebar State:**
- Chat row: Active highlight
- Dataset remains expanded
- No page reload needed (client-side navigation)

---

### Flow 3: Create New Chat
1. User clicks "New Chat" button
2. Button shows loading spinner, becomes disabled
3. Backend creates new Conversation under active dataset
4. New conversation appears at top of chat list with "new" badge
5. User is navigated to that conversation
6. If mobile: drawer closes automatically
7. Chat area shows welcome screen prompting first question

**Sidebar State:**
- Dataset remains active and expanded
- New chat row shows at top
- Active highlight on new chat
- Loading spinner clears after navigation

---

### Flow 4: Upload New Dataset
1. User clicks "Upload Dataset" button
2. Upload modal opens (via `useUploadModal`)
3. User uploads CSV and waits for processing
4. Modal closes on success
5. Sidebar calls `refreshDatasets()` to reload dataset list
6. New dataset appears at bottom of tree (or sorted by name)
7. User can interact with new dataset's chats

**Sidebar State:**
- Dataset tree updates
- If this is the user's first dataset, empty state clears
- Datasets remain in same expand/collapse state (except new dataset starts collapsed)

---

### Flow 5: Switch Dataset (Multi-Dataset Setup)
1. User clicks different dataset row (e.g., "Sales Data")
2. Dataset becomes active and expands
3. Previous dataset's chats remain visible but inactive
4. Active conversation resets (if it belonged to previous dataset)
5. Chat area shows welcome screen for new dataset
6. If mobile: drawer closes automatically

**Sidebar State:**
- Previous dataset: Remains expanded (or collapses if preference)
- New dataset: Becomes active, expands, shows its chats
- Active conversation highlight clears

---

## Styling & Visual Hierarchy

### Color Scheme (Reuse from current theme)
- **Background:** `rgba(12, 15, 22, 0.75)` (dark navy)
- **Border:** `rgba(255,255,255,0.06)` (subtle divider)
- **Text:** Slate-400, slate-500, slate-600 for hierarchy
- **Active state:** `brand-indigo` or `bg-brand-indigo/15` highlight
- **Hover state:** `hover:bg-white/5` subtle hover
- **Error:** Red accent `text-red-300` or `rgba(239,68,68,0.08)`

### Typography
- **Headers:** `text-[10px] font-semibold uppercase tracking-[0.15em]` (existing style)
- **Dataset name:** `text-sm font-medium`
- **Chat title:** `text-sm`
- **Metadata:** `text-[10px] text-slate-500`
- **Helper text:** `text-xs text-slate-600`

### Spacing & Layout
- **Container:** `h-full flex flex-col`
- **Header actions:** `px-4 py-3` padding, `gap-2` button spacing
- **Dataset node:** `px-3 py-2.5 rounded-lg mx-1` with `m-1` negative space
- **Chat node:** `px-3 py-2 rounded-lg ml-4` (indented under dataset)
- **List container:** `py-2` top/bottom padding, `space-y-0.5` for compact items

### Interactive States
- **Hover:** Subtle `bg-white/5` background
- **Active:** `bg-brand-indigo/15` background or `text-brand-indigo` accent
- **Disabled:** `opacity-50 cursor-not-allowed` for buttons
- **Loading:** Spinner icon or skeleton animation

---

## Implementation Roadmap (For Phase 2-3)

### Phase 2 Dependencies
- [ ] Build `SidebarViewModel` hook combining useDatasets + useConversation
- [ ] Implement `useDatasetConversations(datasetId)` for per-dataset chat caching
- [ ] Define state transitions for expand/collapse, dataset selection, chat creation
- [ ] Document error boundaries and recovery flows

### Phase 3 Dependencies
- [ ] Replace ConversationRail.tsx body with new NonTechSidebar component
- [ ] Create SidebarHeaderActions.tsx sub-component
- [ ] Create DatasetTree.tsx sub-component
- [ ] Create DatasetNode.tsx sub-component
- [ ] Create ChatNodeList.tsx sub-component
- [ ] Create ChatNode.tsx sub-component
- [ ] Create SidebarEmptyState.tsx and SidebarErrorState.tsx
- [ ] Ensure AppShell integration remains unchanged (onNavigate callback)

### Phase 4 Dependencies
- [ ] Refine copy for empty states and helper text
- [ ] Validate non-tech user clarity of labels (user testing)
- [ ] Add tooltips for advanced actions (retry, dataset switch)

---

## Acceptance Criteria for Phase 1

- [ ] IA document complete and approved
- [ ] All component prop interfaces defined
- [ ] State flow contract clearly documented
- [ ] All empty/loading/error states defined
- [ ] User flows documented with sidebar state changes
- [ ] Visual design aligned with current theme
- [ ] No changes to AppShell or provider contract
- [ ] Verified against Plan goals (nested tree, remove rename/delete, 3 CTAs prominent, mobile auto-close)

