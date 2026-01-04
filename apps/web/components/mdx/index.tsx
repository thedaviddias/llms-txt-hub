'use client'

import { cn } from '@thedaviddias/design-system/lib/utils'
import type { MDXComponents } from 'mdx/types'
import Link from 'next/link'
import { createContext, useContext } from 'react'

// Context to track if code is inside a pre block
const CodeBlockContext = createContext(false)

export const components: MDXComponents = {
  h1: () => {
    // Return null to skip rendering the H1 from markdown
    return null
  },
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        'mt-10 scroll-m-20 border-b pb-1 text-2xl font-semibold tracking-tight first:mt-0',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn('mt-8 scroll-m-20 text-2xl font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn('mt-8 scroll-m-20 text-xl font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn('mt-8 scroll-m-20 text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn('mt-8 scroll-m-20 text-base font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <Link
      className={cn('font-medium underline underline-offset-4', className)}
      {...props}
      href={props.href || '#'}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={cn('leading-7 [&:not(:first-child)]:mt-6', className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn('my-6 ml-6 list-disc', className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn('my-6 ml-6 list-decimal', className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn('mt-2', className)} {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn('mt-6 border-l-2 pl-6 italic [&>*]:text-muted-foreground', className)}
      {...props}
    />
  ),
  img: ({
    className,
    alt,
    ...props
  }: { className?: string; alt: string } & React.ImgHTMLAttributes<HTMLImageElement>) => (
    // biome-ignore lint/performance/noImgElement: MDX images need standard img for dynamic src
    <img className={cn('rounded-md', className)} alt={alt} {...props} />
  ),
  hr: ({ ...props }) => <hr className="my-4 md:my-8" {...props} />,
  table: ({ className, ...props }) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className={cn('w-full', className)} {...props} />
    </div>
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn('m-0 border-t p-0 even:bg-muted', className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        'border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        'border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <CodeBlockContext.Provider value={true}>
      <pre
        className={cn(
          'mb-4 mt-6 overflow-x-auto rounded-none border border-border/50 p-4 text-sm',
          'bg-neutral-100 dark:bg-neutral-900',
          '[&_code]:bg-transparent [&_code]:p-0 [&_code]:text-neutral-800 [&_code]:dark:text-neutral-200',
          '[&_code_span]:bg-transparent', // Remove inline span backgrounds for cleaner look (increased specificity)
          className
        )}
        {...props}
      />
    </CodeBlockContext.Provider>
  ),
  code: ({ className, ...props }) => {
    // Check if this code is inside a pre block using context
    const isInsidePreBlock = useContext(CodeBlockContext)

    // Only apply inline styles if NOT inside a pre block
    const isInline = !isInsidePreBlock

    return (
      <code
        className={cn(
          'font-mono text-sm',
          isInline && 'relative rounded-sm bg-muted/80 px-1.5 py-0.5 text-foreground',
          className
        )}
        {...props}
      />
    )
  }
}
