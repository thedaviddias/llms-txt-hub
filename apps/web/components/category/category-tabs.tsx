'use client'

import { Tabs, TabsList, TabsTrigger } from '@thedaviddias/design-system/tabs'

export function CategoryTabs() {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-transparent">
        <TabsTrigger value="all" className="font-mono">
          All
        </TabsTrigger>
        <TabsTrigger value="ai" className="font-mono">
          AI
        </TabsTrigger>
        <TabsTrigger value="developer-tools" className="font-mono">
          Developer Tools
        </TabsTrigger>
        <TabsTrigger value="finance" className="font-mono">
          Finance
        </TabsTrigger>
        <TabsTrigger value="products" className="font-mono">
          Products
        </TabsTrigger>
        <TabsTrigger value="websites" className="font-mono">
          Websites
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
