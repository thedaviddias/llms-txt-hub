import * as z from 'zod'
import { categories } from '@/lib/categories'

/**
 * Validation schema for Step 1 of the submit form
 */
export const step1Schema = z.object({
  website: z
    .string()
    .url({
      message: 'Please enter a valid URL.'
    })
    .refine(
      value =>
        !value.toLowerCase().includes('llms.txt') && !value.toLowerCase().includes('llms-full.txt'),
      {
        message:
          'Please enter your website URL, not the path to your llms.txt or llms-full.txt file'
      }
    )
})

const validCategorySlugs = categories.map(category => category.slug) as [string, ...string[]]

/**
 * Validation schema for Step 2 of the submit form
 */
export const step2Schema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.'
    })
    .max(30, {
      message: 'Name must be less than 30 characters for optimal display and SEO.'
    })
    .refine(value => !value.endsWith('.'), {
      message: 'Name should not end with a period.'
    }),
  description: z
    .string()
    .min(50, {
      message: 'Description must be at least 50 characters for better context.'
    })
    .max(160, {
      message: 'Description must be less than 160 characters for optimal SEO.'
    })
    .refine(value => value.endsWith('.'), {
      message: 'Description should end with a period.'
    }),
  mdxContent: z.string().optional().nullable(),
  website: z
    .string()
    .url({
      message: 'Please enter a valid URL.'
    })
    .refine(
      value =>
        !value.toLowerCase().includes('llms.txt') && !value.toLowerCase().includes('llms-full.txt'),
      {
        message:
          'Please enter your website URL, not the path to your llms.txt or llms-full.txt file'
      }
    ),
  llmsUrl: z
    .string()
    .url({
      message: 'Please enter a valid URL.'
    })
    .refine(value => /llms\.txt(?:$|\?)/i.test(value), {
      message: 'URL must end with llms.txt'
    }),
  llmsFullUrl: z
    .union([
      z.literal(''),
      z
        .string()
        .url({
          message: 'Please enter a valid URL.'
        })
        .refine(value => /llms-full\.txt(?:$|\?)/i.test(value), {
          message: 'URL must end with llms-full.txt'
        }),
      z.null()
    ])
    .optional(),
  category: z.enum(validCategorySlugs, {
    errorMap: () => ({ message: 'Please select a valid category' })
  })
})

export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>

/**
 * Server-side validation schema for submitLlmsTxt action (FormData payload)
 */
export const submitActionSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(30, { message: 'Name must be less than 30 characters.' })
    .refine(value => !value.endsWith('.'), { message: 'Name should not end with a period.' }),
  description: z
    .string()
    .min(50, { message: 'Description must be at least 50 characters.' })
    .max(160, { message: 'Description must be less than 160 characters.' })
    .refine(value => value.endsWith('.'), { message: 'Description should end with a period.' }),
  website: z
    .string()
    .url({ message: 'Please enter a valid URL.' })
    .refine(
      value =>
        !value.toLowerCase().includes('llms.txt') && !value.toLowerCase().includes('llms-full.txt'),
      {
        message:
          'Please enter your website URL, not the path to your llms.txt or llms-full.txt file'
      }
    ),
  llmsUrl: z
    .string()
    .url({ message: 'Please enter a valid URL.' })
    .refine(value => /llms\.txt(?:$|\?)/i.test(value), { message: 'URL must end with llms.txt' }),
  llmsFullUrl: z
    .union([
      z.literal(''),
      z
        .string()
        .url({ message: 'Please enter a valid URL.' })
        .refine(value => /llms-full\.txt(?:$|\?)/i.test(value), {
          message: 'URL must end with llms-full.txt'
        }),
      z.null()
    ])
    .optional(),
  category: z.enum(validCategorySlugs, {
    errorMap: () => ({ message: 'Please select a valid category' })
  }),
  publishedAt: z.string().min(1, { message: 'Publication date is required' })
})

export type SubmitActionData = z.infer<typeof submitActionSchema>
