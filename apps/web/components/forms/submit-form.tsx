'use client'

import { submitLlmsTxt } from '@/app/actions'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@thedaviddias/design-system/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@thedaviddias/design-system/form'
import { Input } from '@thedaviddias/design-system/input'
import { useToast } from '@thedaviddias/design-system/use-toast'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  website: z.string().url({
    message: 'Please enter a valid URL.',
  }),
  llmsUrl: z.string().url({
    message: 'Please enter a valid llms.txt URL.',
  }),
  llmsFullUrl: z
    .string()
    .url({
      message: 'Please enter a valid llms-full.txt URL.',
    })
    .optional(),
})

export function SubmitForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
      llmsUrl: '',
      llmsFullUrl: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (value) formData.append(key, value)
      })

      const result = await submitLlmsTxt(formData)

      if (result.success) {
        toast({
          title: 'Submission successful',
          description: `Your PR has been created: ${result.prUrl}`,
        })
        form.reset()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: 'There was an error submitting your llms.txt. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormDescription>The name of your project or website.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Add other form fields here */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </Form>
  )
}
