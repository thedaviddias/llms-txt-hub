'use client'

import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { categories } from '@/lib/categories'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@thedaviddias/design-system/button'
import {} from '@thedaviddias/design-system/form'
import {
  Form,
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
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const step1Schema = z.object({
  website: z.string().url({
    message: 'Please enter a valid URL.'
  })
})

// Extract valid category slugs from categories array
const validCategorySlugs = categories.map(category => category.slug) as [string, ...string[]]

const step2Schema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.'
    })
    .max(50, {
      message: 'Name must be less than 50 characters for optimal display and SEO.'
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
  website: z.string().url({
    message: 'Please enter a valid URL.'
  }),
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
        })
    ])
    .optional()
    .default(''),
  category: z.enum(validCategorySlugs, {
    errorMap: () => ({ message: 'Please select a valid category' })
  })
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export function SubmitForm() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [prUrl, setPrUrl] = useState<string>('')

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      website: ''
    }
  })

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
      llmsUrl: '',
      llmsFullUrl: '',
      category: ''
    }
  })

  async function onFetchMetadata(data: Step1Data) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: data.website })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch metadata')
      }

      const result = await response.json()

      if (result.isDuplicate) {
        toast.warning(
          `This website is already in our directory under the name "${result.existingWebsite.name}".`
        )
        setIsLoading(false)
        return
      }

      // Pre-populate form with fetched metadata
      step2Form.reset({
        name: result.metadata.name || '',
        description: result.metadata.description || '',
        website: data.website,
        llmsUrl: result.metadata.llmsUrl || '',
        llmsFullUrl: result.metadata.llmsFullUrl || '',
        category: result.metadata.category || ''
      })

      setStep(2)
      toast.success('Website info fetched. Please review and complete the submission.')
    } catch (error) {
      toast.error('Failed to fetch website information. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmitStep2(values: Step2Data) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (value) formData.append(key, value)
      })

      const result = await submitLlmsTxt(formData)

      if (result.success && result.prUrl) {
        toast.success('Your PR has been created successfully!')
        setPrUrl(result.prUrl as string)
        setStep(3)
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'There was an error submitting your llms.txt. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleBack() {
    step2Form.reset()
    step1Form.reset()
    setStep(1)
  }

  function handleSubmitAnother() {
    setPrUrl('')
    step1Form.reset()
    step2Form.reset()
    setStep(1)
  }

  return (
    <>
      {(step === 1 || step === 2) && (
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">Submit your llms.txt</h1>
          <p className="text-muted-foreground">
            Enter your website's domain to automatically fetch your llms.txt information. You'll
            have a chance to review and edit the details before submitting.
          </p>
        </div>
      )}

      {step === 1 ? (
        <Form {...step1Form}>
          <form onSubmit={step1Form.handleSubmit(onFetchMetadata)} className="space-y-8">
            <FormField
              control={step1Form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              {isLoading ? 'Fetching...' : 'Fetch website info'}
            </Button>
          </form>
        </Form>
      ) : step === 2 ? (
        <Form {...step2Form}>
          <form onSubmit={step2Form.handleSubmit(onSubmitStep2)} className="space-y-8">
            <FormField
              control={step2Form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="llmsUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>llms.txt URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="llmsFullUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>llms-full.txt URL (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem
                          key={category.slug}
                          value={category.slug}
                          className="bg-white dark:bg-gray-950 p-2"
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                onClick={handleBack}
                className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Start over
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                {isLoading ? 'Submitting...' : 'Submit Pull Request'}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Successfully Submitted! 🎉</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your llms.txt has been submitted successfully. A pull request has been created for
              review and will be merged soon.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="button" asChild>
              <Link href={prUrl} target="_blank">
                View Pull Request
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
