'use client'

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
import type { UseFormReturn } from 'react-hook-form'
import type { Step1Data } from './submit-form-schemas'

interface SubmitFormStep1Props {
  form: UseFormReturn<Step1Data>
  onSubmit: (data: Step1Data) => void
  isLoading: boolean
}

/**
 * Step 1 of the submit form - Website URL input
 */
export function SubmitFormStep1({ form, onSubmit, isLoading }: SubmitFormStep1Props) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Website URL <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com"
                  className="px-4 py-2 rounded-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500 dark:text-red-400" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900 plausible-event-name=Form+Step+Complete"
        >
          {isLoading ? 'Fetching...' : 'Get Website Details'}
        </Button>
      </form>
    </Form>
  )
}
