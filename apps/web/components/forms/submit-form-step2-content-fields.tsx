'use client'

import { CharacterCounter } from '@/components/ui/character-counter'
import { nonToolCategories, toolCategories } from '@/lib/categories'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@thedaviddias/design-system/form'
import { Input } from '@thedaviddias/design-system/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@thedaviddias/design-system/select'
import { Textarea } from '@thedaviddias/design-system/textarea'
import type { UseFormReturn } from 'react-hook-form'
import { MDXTextarea } from './mdx-textarea'
import type { Step2Data } from './submit-form-schemas'

interface ContentFieldsProps {
  form: UseFormReturn<Step2Data>
}

/**
 * Content fields for Step 2 of the submit form
 */
export function ContentFields({ form }: ContentFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>
                Name <span className="text-red-500">*</span>
              </FormLabel>
              <CharacterCounter current={field.value?.length || 0} max={30} />
            </div>
            <FormControl>
              <Input className="px-4 py-2 rounded-lg" {...field} />
            </FormControl>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                "-llms-txt" is automatically added to create the filename.
              </p>
              {field.value && (
                <p className="text-xs text-muted-foreground">
                  MDX filename:{' '}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">
                    {field.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')}
                    -llms-txt.mdx
                  </code>
                </p>
              )}
            </div>
            <FormMessage className="text-red-500 dark:text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>
                Description <span className="text-red-500">*</span>
              </FormLabel>
              <CharacterCounter current={field.value?.length || 0} max={160} />
            </div>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage className="text-red-500 dark:text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="mdxContent"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Content (optional)</FormLabel>
            <FormControl>
              <MDXTextarea
                value={field.value || ''}
                onChange={field.onChange}
                placeholder={`## Key Focus Areas

- **AI Integration**: Details about AI/ML capabilities
- **API Documentation**: Coverage of API endpoints and usage
- **Developer Tools**: Build tools, SDKs, and integrations
- **Data Processing**: How data is handled and transformed

## About llms.txt Implementation

Our llms.txt file provides comprehensive documentation about our platform's AI-ready content structure, making it easy for language models to understand and work with our system.

## Features

- Feature 1: Description of key functionality
- Feature 2: Another important capability
- Feature 3: Additional tools and integrations

## Getting Started

Brief overview of how users can get started with this project, including any setup requirements or first steps.`}
              />
            </FormControl>
            <FormMessage className="text-red-500 dark:text-red-400" />
            <p className="text-sm text-muted-foreground">
              Use markdown to format your content. This will be added to the project's detail page.
            </p>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Category <span className="text-red-500">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="px-4 py-2 rounded-lg">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {/* Tool Categories */}
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Tools & Platforms
                </div>
                {toolCategories.map(category => (
                  <SelectItem
                    key={category.slug}
                    value={category.slug}
                    className="pl-4 text-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}

                {/* Separator */}
                <div className="my-1 h-px bg-border" />

                {/* Non-Tool Categories */}
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Other Sites
                </div>
                {nonToolCategories.map(category => (
                  <SelectItem
                    key={category.slug}
                    value={category.slug}
                    className="pl-4 text-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-red-500 dark:text-red-400" />
          </FormItem>
        )}
      />
    </>
  )
}
