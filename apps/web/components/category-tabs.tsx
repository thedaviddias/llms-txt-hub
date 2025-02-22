'use client'

import { categories } from '@/lib/categories'
import { Tabs, TabsList, TabsTrigger } from '@thedaviddias/design-system/tabs'

export function CategoryTabs() {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-transparent">
        <TabsTrigger value="all" className="font-mono">
          All
        </TabsTrigger>
        {categories.map(category => (
          <TabsTrigger key={category.slug} value={category.slug} className="font-mono">
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
