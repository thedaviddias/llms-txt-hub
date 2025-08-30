# Load More Component System

A comprehensive system for handling paginated content with multiple loading strategies.

## Components

### 1. `LoadMore` - Core Component
The base component that handles different loading strategies.

```tsx
import { LoadMore } from '@/components/ui/load-more'

<LoadMore
  onLoadMore={handleLoadMore}
  hasMore={hasMoreItems}
  isLoading={loading}
  variant="button" // 'button' | 'auto' | 'scroll'
  loadMoreText="Load more items"
  showItemsCount={20}
  totalItemsCount={100}
/>
```

### 2. `useLoadMore` - Hook
Manages pagination state and logic.

```tsx
import { useLoadMore } from '@/hooks/use-load-more'

const {
  displayedItems,
  hasMore,
  isLoading,
  loadMore,
  reset,
  showItemsCount,
  totalItemsCount
} = useLoadMore({
  items: allItems,
  initialItemsPerPage: 12,
  itemsPerLoad: 12
})
```

### 3. `PaginatedContent` - High-level Wrapper
Complete solution with built-in grid layout.

```tsx
import { PaginatedContent } from '@/components/ui/paginated-content'

<PaginatedContent
  items={items}
  renderItem={(item, index) => <ItemCard key={item.id} item={item} />}
  initialItemsPerPage={12}
  itemsPerLoad={12}
  loadMoreVariant="button"
  emptyState={<EmptyState />}
/>
```

## Loading Variants

### 1. Button (Default)
Shows a "Load more" button that users click to load more items.

```tsx
<LoadMore variant="button" />
```

**Best for:**
- User-controlled loading
- High-bandwidth scenarios
- When users might want to stop at a certain point

### 2. Auto
Automatically loads more content immediately when the component mounts.

```tsx
<LoadMore variant="auto" />
```

**Best for:**
- Continuous content consumption
- Social media feeds
- When you want seamless content flow

### 3. Scroll
Loads more content when user scrolls near the bottom of the page.

```tsx
<LoadMore variant="scroll" threshold={200} />
```

**Best for:**
- Infinite scroll experiences
- Mobile-first designs
- Long content lists

## Usage Examples

### Basic Usage with Custom Component

```tsx
'use client'

import { useState } from 'react'
import { LoadMore } from '@/components/ui/load-more'

export function MyItemsList({ items }: { items: Item[] }) {
  const [displayedItems, setDisplayedItems] = useState(items.slice(0, 10))
  const [isLoading, setIsLoading] = useState(false)
  
  const hasMore = displayedItems.length < items.length
  
  const handleLoadMore = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
    
    const nextItems = items.slice(0, displayedItems.length + 10)
    setDisplayedItems(nextItems)
    setIsLoading(false)
  }
  
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {displayedItems.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      
      <LoadMore
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        showItemsCount={displayedItems.length}
        totalItemsCount={items.length}
      />
    </div>
  )
}
```

### Using the Hook

```tsx
'use client'

import { useLoadMore } from '@/hooks/use-load-more'
import { LoadMore } from '@/components/ui/load-more'

export function HookExample({ items }: { items: Item[] }) {
  const {
    displayedItems,
    hasMore,
    isLoading,
    loadMore,
    showItemsCount,
    totalItemsCount
  } = useLoadMore({
    items,
    initialItemsPerPage: 15,
    itemsPerLoad: 15
  })

  return (
    <div>
      <div className="space-y-4">
        {displayedItems.map(item => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
      
      <LoadMore
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        variant="scroll"
        showItemsCount={showItemsCount}
        totalItemsCount={totalItemsCount}
      />
    </div>
  )
}
```

### Complete Solution with PaginatedContent

```tsx
'use client'

import { PaginatedContent } from '@/components/ui/paginated-content'

export function CompleteExample({ websites }: { websites: Website[] }) {
  return (
    <PaginatedContent
      items={websites}
      renderItem={(website, index) => (
        <WebsiteCard 
          key={website.slug} 
          website={website}
          className="animate-in fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        />
      )}
      initialItemsPerPage={18}
      itemsPerLoad={12}
      loadMoreVariant="button"
      loadMoreText="Load more websites"
      noMoreText="All websites loaded"
      emptyState={<EmptyState message="No websites found" />}
      containerClassName="space-y-8"
      itemsClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    />
  )
}
```

## Props Reference

### LoadMore Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onLoadMore` | `() => Promise<void> \| void` | - | Function called when more items should be loaded |
| `hasMore` | `boolean` | - | Whether there are more items to load |
| `isLoading` | `boolean` | `false` | Loading state |
| `loadMoreText` | `string` | `"Load more"` | Text shown on load more button |
| `noMoreText` | `string` | `"No more items"` | Text shown when no more items |
| `showItemsCount` | `number` | - | Number of currently displayed items |
| `totalItemsCount` | `number` | - | Total number of items |
| `variant` | `'button' \| 'auto' \| 'scroll'` | `'button'` | Loading strategy |
| `threshold` | `number` | `200` | Pixels from bottom to trigger scroll loading |

### useLoadMore Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | - | All items to paginate |
| `initialItemsPerPage` | `number` | `12` | Items shown on first load |
| `itemsPerLoad` | `number` | `12` | Items loaded on each "load more" |

### PaginatedContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | - | All items to paginate |
| `renderItem` | `(item: T, index: number) => React.ReactNode` | - | Function to render each item |
| `initialItemsPerPage` | `number` | `12` | Items shown on first load |
| `itemsPerLoad` | `number` | `12` | Items loaded on each "load more" |
| `loadMoreVariant` | `'button' \| 'auto' \| 'scroll'` | `'button'` | Loading strategy |
| `emptyState` | `React.ReactNode` | - | Component shown when no items |
| `itemsClassName` | `string` | `'grid...'` | CSS classes for items container |
| `containerClassName` | `string` | `''` | CSS classes for main container |

## Performance Tips

1. **Use React.memo** for rendered items to prevent unnecessary re-renders
2. **Implement virtualization** for very large datasets (>1000 items)
3. **Add loading skeletons** during the loading state
4. **Consider scroll restoration** when navigating back to paginated content
5. **Use throttling** for scroll-based loading to improve performance

## Examples in Codebase

- **Members List**: `@/components/examples/members-with-load-more.tsx`
- **Websites Grid**: `@/components/examples/websites-with-load-more.tsx`