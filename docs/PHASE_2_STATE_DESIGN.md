# Phase 2: Data Model and State Flow Design

## Overview

Design the state management layer that will power the non-tech sidebar. This includes a new composite hook (`useSidebarViewModel`) that combines existing hooks, a new hook for per-dataset chat caching (`useDatasetConversations`), and detailed state transition diagrams.

## New Hooks to Create

### Hook 1: `useDatasetConversations(datasetId: string | null)`

**Purpose:** Lazy-load and cache conversations for a specific dataset, independent of the current active conversation hook.

**Location:** `frontend/lib/hooks/useDatasetConversations.tsx`

**Signature:**
```typescript
interface UseDatasetConversationsResult {
  // Data
  conversations: Conversation[];
  
  // Loading & Error
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
}

function useDatasetConversations(datasetId: string | null): UseDatasetConversationsResult;
```

**Behavior:**
- If `datasetId` is null, return empty conversations and no loading
- On mount or when `datasetId` changes, initiate fetch via `listConversations(datasetId)`
- Cache the result by `datasetId` (use Map or object keyed by datasetId)
- Do NOT automatically navigate to the first conversation (let sidebar decide)
- Support manual refresh via `refresh()` function
- Clear error on successful refresh

**Cache Strategy:**
```
datasetChatCache = {
  'dataset-1': { conversations: [...], timestamp: <Date> },
  'dataset-2': { conversations: [...], timestamp: <Date> },
  'dataset-3': null, // Pending first load
}
```

**Cache Invalidation Triggers:**
- After new conversation is created under that dataset
- When user explicitly calls `refresh()`
- (Optional Phase 3+) TTL expiry for background invalidation

**Implementation Pseudo-Code:**
```typescript
export function useDatasetConversations(datasetId: string | null) {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refresh = useCallback(async () => {
    if (!datasetId) {
      setConversations([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const convs = await listConversations(datasetId);
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.set(datasetId, { conversations: convs, timestamp: Date.now() });
        return newCache;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [datasetId]);
  
  useEffect(() => {
    refresh();
  }, [datasetId, refresh]);
  
  const cacheEntry = datasetId ? cache.get(datasetId) : null;
  return {
    conversations: cacheEntry?.conversations || [],
    isLoading,
    error,
    refresh,
  };
}
```

**Error Handling:**
- If API call fails, set `error` message
- Don't automatically retry (let caller decide via `refresh()` button)
- Clear error when retry succeeds

---

### Hook 2: `useSidebarViewModel()`

**Purpose:** Composite hook that orchestrates sidebar state by combining `useDatasets`, `useConversation`, `useUploadModal`, `useDatasetConversations`, and local expand/collapse state.

**Location:** `frontend/lib/hooks/useSidebarViewModel.tsx`

**Signature:**
```typescript
interface SidebarViewModel {
  // Datasets
  datasets: Dataset[];
  activeDataset: Dataset | null;
  setActiveDataset: (dataset: Dataset) => void;
  datasetsLoading: boolean;
  datasetsError: string | null;
  
  // Conversations (per-dataset caching)
  conversationsByDataset: Map<string, Conversation[]>;
  loadingDatasetIds: Set<string>; // Which datasets are loading chats
  errorsByDataset: Map<string, string>; // Errors per dataset
  retryLoadDatasetConversations: (datasetId: string) => void;
  
  // Active Conversation
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation) => void;
  
  // Actions
  createNewChat: (title?: string) => Promise<Conversation | null>;
  openUploadModal: () => void;
  
  // Local State (Expand/Collapse)
  expandedDatasetIds: Set<string>;
  toggleExpandDataset: (datasetId: string) => void;
  
  // Derived States
  isCreatingChat: boolean; // Is new chat creation in progress
}

function useSidebarViewModel(): SidebarViewModel;
```

**Implementation Strategy:**

```typescript
export function useSidebarViewModel(): SidebarViewModel {
  const { datasets, activeDataset, setActiveDataset, isLoading: datasetsLoading, error: datasetsError, refreshDatasets } = useDatasets();
  const { activeConversation, setActiveConversation, createNewConversation, isLoading: conversationCreating } = useConversation();
  const { openUploadModal } = useUploadModal();
  
  // Per-dataset chat caching
  const [conversationsByDataset, setConvsByDataset] = useState<Map<string, Conversation[]>>(new Map());
  const [loadingDatasetIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorsByDataset, setErrorsByDataset] = useState<Map<string, string>>(new Map());
  
  // Expand/collapse state (persist to sessionStorage)
  const [expandedDatasetIds, setExpandedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('gina-expanded-datasets');
      return new Set(saved ? JSON.parse(saved) : []);
    }
    return new Set();
  });
  
  // When active dataset changes, auto-expand it
  useEffect(() => {
    if (activeDataset && !expandedDatasetIds.has(activeDataset.id)) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.add(activeDataset.id);
        return next;
      });
    }
  }, [activeDataset, expandedDatasetIds]);
  
  // Load conversations for each expanded dataset
  useEffect(() => {
    const loadConversations = async () => {
      for (const datasetId of expandedDatasetIds) {
        if (!conversationsByDataset.has(datasetId)) {
          // Lazy load chats for this dataset
          setLoadingIds(prev => new Set([...prev, datasetId]));
          try {
            const convs = await listConversations(datasetId);
            setConvsByDataset(prev => new Map(prev).set(datasetId, convs));
            setErrorsByDataset(prev => {
              const next = new Map(prev);
              next.delete(datasetId);
              return next;
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load conversations';
            setErrorsByDataset(prev => new Map(prev).set(datasetId, message));
          } finally {
            setLoadingIds(prev => {
              const next = new Set(prev);
              next.delete(datasetId);
              return next;
            });
          }
        }
      }
    };
    
    loadConversations();
  }, [expandedDatasetIds, conversationsByDataset]);
  
  const toggleExpandDataset = useCallback((datasetId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      // Persist to sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gina-expanded-datasets', JSON.stringify([...next]));
      }
      return next;
    });
  }, []);
  
  const retryLoadDatasetConversations = useCallback(async (datasetId: string) => {
    setLoadingIds(prev => new Set([...prev, datasetId]));
    try {
      const convs = await listConversations(datasetId);
      setConvsByDataset(prev => new Map(prev).set(datasetId, convs));
      setErrorsByDataset(prev => {
        const next = new Map(prev);
        next.delete(datasetId);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      setErrorsByDataset(prev => new Map(prev).set(datasetId, message));
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(datasetId);
        return next;
      });
    }
  }, []);
  
  const createNewChat = useCallback(async (title?: string) => {
    const result = await createNewConversation(title);
    if (result && activeDataset) {
      // Invalidate cache for active dataset (new chat added)
      setConvsByDataset(prev => {
        const next = new Map(prev);
        next.delete(activeDataset.id);
        return next;
      });
      // Trigger reload of this dataset's chats
      await retryLoadDatasetConversations(activeDataset.id);
    }
    return result;
  }, [createNewConversation, activeDataset, retryLoadDatasetConversations]);
  
  const handleUploadModal = useCallback(() => {
    openUploadModal();
    // Listen for upload completion (sidebar should refresh datasets)
    // This is handled by the upload modal via event or callback
    // For now, rely on manual refresh trigger
  }, [openUploadModal]);
  
  return {
    // Datasets
    datasets,
    activeDataset,
    setActiveDataset,
    datasetsLoading,
    datasetsError,
    
    // Conversations (per-dataset)
    conversationsByDataset,
    loadingDatasetIds,
    errorsByDataset,
    retryLoadDatasetConversations,
    
    // Active conversation
    activeConversation,
    setActiveConversation,
    
    // Actions
    createNewChat,
    openUploadModal: handleUploadModal,
    
    // Expand/collapse
    expandedDatasetIds,
    toggleExpandDataset,
    
    // Derived
    isCreatingChat: conversationCreating,
  };
}
```

**Key Design Decisions:**
1. **Per-dataset caching:** Conversations are cached by datasetId, not just the active dataset
2. **Lazy loading on expand:** Chats only load when a dataset is expanded (saves bandwidth)
3. **Persistent expand state:** Expand/collapse preference saved to sessionStorage so it survives page refresh
4. **Auto-expand active dataset:** When user switches to a different active dataset, it automatically expands
5. **Independent error handling:** Each dataset has its own loading/error state, not blocking others
6. **Cache invalidation on create:** After creating a new chat, that dataset's cache is invalidated and reloaded

---

## State Transition Diagrams

### State 1: Initial Load (No Active Dataset)
```
┌─────────────────────────┐
│  Initial State          │
├─────────────────────────┤
│ datasets: []            │
│ activeDataset: null     │
│ conversationsByDataset: {} │
│ expandedDatasetIds: {}  │
│ isCreatingChat: false   │
└─────────────────────────┘
         ↓
  [useDatasets loads]
         ↓
┌─────────────────────────┐
│  Datasets Loaded        │
├─────────────────────────┤
│ datasets: [d1, d2, d3]  │
│ activeDataset: null (no saved preference) │
│ conversationsByDataset: {} │
│ expandedDatasetIds: {}  │
└─────────────────────────┘
```

### State 2: Select First Dataset
```
User clicks on dataset d1 row
        ↓
[setActiveDataset(d1)]
        ↓
┌─────────────────────────┐
│  Active Dataset Set      │
├─────────────────────────┤
│ activeDataset: d1       │
│ expandedDatasetIds: {d1} │
└─────────────────────────┘
        ↓
[useEffect: auto-expand active dataset]
        ↓
[useEffect: load conversations for d1]
        ↓
┌─────────────────────────┐
│  Dataset Expanded,      │
│  Chats Loading          │
├─────────────────────────┤
│ loadingDatasetIds: {d1} │
│ conversationsByDataset: {} (loading) │
└─────────────────────────┘
        ↓
[API call completes]
        ↓
┌─────────────────────────┐
│  Chats Loaded           │
├─────────────────────────┤
│ conversationsByDataset: {d1: [c1, c2, c3]} │
│ loadingDatasetIds: {}   │
│ errorsByDataset: {}     │
└─────────────────────────┘
```

### State 3: Create New Chat
```
User clicks "New Chat" button under d1
        ↓
[createNewChat()]
        ↓
┌─────────────────────────┐
│  Chat Creation Start    │
├─────────────────────────┤
│ isCreatingChat: true    │
│ activeConversation: null │
└─────────────────────────┘
        ↓
[Backend creates conversation]
        ↓
┌─────────────────────────┐
│  Cache Invalidation     │
├─────────────────────────┤
│ conversationsByDataset: {d1: undefined} (clear) │
│ loadingDatasetIds: {d1} │
└─────────────────────────┘
        ↓
[Reload chats for d1]
        ↓
┌─────────────────────────┐
│  Chat Created           │
├─────────────────────────┤
│ conversationsByDataset: {d1: [new_chat, c1, c2, c3]} │
│ activeConversation: new_chat │
│ isCreatingChat: false   │
└─────────────────────────┘
        ↓
[Navigate to /app/[new_chat.id]]
```

### State 4: Switch Datasets
```
User clicks on dataset d2 (currently have d1 active)
        ↓
[setActiveDataset(d2)]
        ↓
┌─────────────────────────┐
│  Active Dataset Changes │
├─────────────────────────┤
│ activeDataset: d2       │
│ activeConversation: null (reset) │
│ expandedDatasetIds: {d1, d2} │
└─────────────────────────┘
        ↓
[useEffect: load conversations for d2]
        ↓
[if d2 chats already cached, use cache]
   OR
[if d2 chats not cached, load via API]
        ↓
┌─────────────────────────┐
│  Dataset d2 Active      │
├─────────────────────────┤
│ conversationsByDataset: {d1: [...], d2: [...]} │
│ activeDataset: d2       │
│ activeConversation: null │
└─────────────────────────┘
        ↓
[Navigate to /app (or show welcome)]
```

### State 5: Dataset Chat Load Error & Retry
```
User expands dataset d3
        ↓
[useEffect: load conversations for d3]
        ↓
┌─────────────────────────┐
│  Chat Load Failure      │
├─────────────────────────┤
│ loadingDatasetIds: {d3} |
│ errorsByDataset: {d3: "Network error"} │
│ conversationsByDataset: {d3: []} │
└─────────────────────────┘
        ↓
User clicks [Retry] button
        ↓
[retryLoadDatasetConversations(d3)]
        ↓
┌─────────────────────────┐
│  Retrying               │
├─────────────────────────┤
│ loadingDatasetIds: {d3} │
│ errorsByDataset: {d3: "...loading"} or cleared │
└─────────────────────────┘
        ↓
[API call succeeds]
        ↓
┌─────────────────────────┐
│  Chat Loaded (Retry)    │
├─────────────────────────┤
│ conversationsByDataset: {d3: [c1, c2]} │
│ errorsByDataset: {} (cleared) │
│ loadingDatasetIds: {} │
└─────────────────────────┘
```

### State 6: Upload New Dataset
```
User clicks "Upload Dataset" button
        ↓
[openUploadModal()]
        ↓
[User uploads CSV]
        ↓
[Backend processes + new dataset created]
        ↓
[Upload modal triggers dataset refresh]
        ↓
[refreshDatasets() called]
        ↓
┌─────────────────────────┐
│  Dataset List Refreshed │
├─────────────────────────┤
│ datasets: [d1, d2, d3, new_d4] │
│ conversationsByDataset: (unchanged) │
│ expandedDatasetIds: (unchanged) │
└─────────────────────────┘
        ↓
[Sidebar renders new dataset at bottom]
```

---

## Error Boundaries & Recovery Flows

### Error: Dataset List Load Fails
```
Trigger: Initial useDatasets fetch fails
State: datasetsError = "Failed to fetch datasets"
UI: Show error box in sidebar header

Recovery:
1. User clicks [Retry] in error box
2. Call refreshDatasets()
3. If success: clear error, render dataset tree
4. If failure: show error again (allow infinite retry)

Sidebar continues working:
- Conversations are not blocked
- Upload modal can still open
```

### Error: Conversation List Fails for Specific Dataset
```
Trigger: useDatasetConversations fetch for d1 fails
State: errorsByDataset[d1] = "Failed to fetch conversations"
UI: Show error box under dataset d1 node, [Retry] button

Recovery:
1. User clicks [Retry] under dataset node
2. Call retryLoadDatasetConversations(d1)
3. If success: clear error, render chats
4. If failure: show error again

Sidebar continues working:
- Other datasets unaffected
- Can still create new chat for other datasets
- Upload modal unaffected
```

### Error: New Chat Creation Fails
```
Trigger: createNewConversation API fails
State: isCreatingChat = true, then error set
UI: [New Chat] button shows error state, then re-enabled
   Chat row does not appear (no placeholder)

Recovery:
1. Error message shown in toast or inline
2. User can retry by clicking [New Chat] again
3. If success: proceed as normal
4. If failure: show error again

Sidebar continues working:
- Can still select other chats
- Can still switch datasets
- Upload modal can still open
```

### Error: Active Conversation Belongs to Non-Active Dataset
```
Trigger: Deep link to /app/conv-123, but conv-123 belongs to d2
         while activeDataset is d1 (or null)
State: activeConversation points to conv-123 from d2

Recovery (Phase 5):
1. Detect mismatch: activeConversation.datasetId !== activeDataset.id
2. Call setActiveDataset(d2) to switch
3. Expand d2 in sidebar
4. Load d2's conversations (if not cached)
5. Set activeConversation to conv-123
6. Render chat messages for conv-123

Sidebar state:
- d2 becomes active (visual highlight)
- d2 expands
- conv-123 shows as active in chat list
```

---

## Cache Invalidation Strategy

### When to Invalidate Conversation Cache

| Trigger | Dataset ID | Action |
|---------|-----------|--------|
| New chat created | active dataset | Delete cache, reload on next expand |
| Dataset deleted | deleted dataset | Remove cache entry |
| (Optional) TTL expiry | any | Remove cache older than 5 min |
| User clicks [Refresh] | specific dataset | Delete cache, reload immediately |
| App returns to focus | all | Optionally refresh active dataset (TODO Phase 3+) |

### Invalidation Code Pattern

```typescript
// Invalidate single dataset
setConvsByDataset(prev => {
  const next = new Map(prev);
  next.delete(datasetId); // Remove from cache
  return next;
});

// Then reload if expanded
if (expandedDatasetIds.has(datasetId)) {
  retryLoadDatasetConversations(datasetId);
}
```

---

## Performance Considerations

### Lazy Loading Benefits
- **Reduced initial load:** Only datasets list is fetched on app load
- **Reduced bandwidth:** Chats only fetched when user expands that dataset
- **Reduced memory:** Only expanded datasets' chats are in memory

### Caching Benefits
- **Avoid re-fetch on collapse/expand:** If user expands d1, then d2, then d1 again, d1's chats are still in cache
- **Improve perceived performance:** Expanded datasets render instantly
- **Reduce API calls:** Only new expands or manual refreshes trigger API calls

### Potential Optimization (Phase 3+)
- Preload chats for active dataset immediately (while other datasets lazy-load)
- Debounce expand clicks to avoid rapid expand/collapse causing burst API calls
- Implement TTL-based cache expiry for background refresh
- Implement resumable/cancellable fetch (abort on unmount)

---

## Hook Integration Test Checklist (For Phase 3)

- [ ] `useSidebarViewModel()` returns all expected properties
- [ ] Datasets load on mount
- [ ] Expanding a dataset triggers conversation fetch
- [ ] Conversation cache persists across expand/collapse toggle
- [ ] Creating new chat invalidates and reloads dataset's chat list
- [ ] Switching active dataset auto-expands and loads chats
- [ ] Error retry successfully recovers failed chat loads
- [ ] Expand/collapse state persists to sessionStorage
- [ ] No infinite loops in useEffect dependencies
- [ ] All API calls use correct dataset IDs

---

## Acceptance Criteria for Phase 2

- [ ] `useDatasetConversations` hook implemented and tested
- [ ] `useSidebarViewModel` hook implemented and tested
- [ ] State transition diagrams validated against hook behavior
- [ ] Error handling flows documented
- [ ] Cache invalidation strategy documented
- [ ] All dependencies reviewed for correctness
- [ ] No circular dependencies between hooks
- [ ] Performance impact of caching assessed
- [ ] Ready for Phase 3 component migration

