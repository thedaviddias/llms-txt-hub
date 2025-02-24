'use client'

import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@thedaviddias/design-system/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@thedaviddias/design-system/form'
import { Input } from '@thedaviddias/design-system/input'
import { useToast } from '@thedaviddias/design-system/use-toast'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const step1Schema = z.object({
  website: z.string().url({
    message: 'Please enter a valid URL.'
  })
})

const step2Schema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.'
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.'
  }),
  website: z.string().url({
    message: 'Please enter a valid URL.'
  }),
  llmsUrl: z.string().url({
    message: 'Please enter a valid llms.txt URL.'
  }),
  llmsFullUrl: z
    .string()
    .url({
      message: 'Please enter a valid llms-full.txt URL.'
    })
    .optional()
    .or(z.literal(''))
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export function SubmitForm() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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
      llmsFullUrl: ''
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

      const metadata = await response.json()

      // Pre-populate form with fetched metadata
      step2Form.reset({
        name: metadata.name || '',
        description: metadata.description || '',
        website: data.website,
        llmsUrl: metadata.llmsUrl || '',
        llmsFullUrl: metadata.llmsFullUrl || ''
      })

      setStep(2)
      toast({
        title: 'Website info fetched',
        description: 'Please review and complete the submission.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch website information. Please try again.',
        variant: 'destructive'
      })
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

      if (result.success) {
        toast({
          title: 'Submission successful',
          description: `Your PR has been created: ${result.prUrl}`
        })
        step1Form.reset()
        step2Form.reset()
        setStep(1)
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast({
        title: 'Submission failed',
        description:
          error instanceof Error
            ? error.message
            : 'There was an error submitting your llms.txt. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
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
      ) : (
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
                    <Input {...field} />
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

            <div className="flex gap-4">
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
      )}
    </>
  )
}
