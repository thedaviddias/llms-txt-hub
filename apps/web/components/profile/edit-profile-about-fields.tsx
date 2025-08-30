'use client'

import { CharacterCounter } from '@/components/ui/character-counter'

interface AboutFieldsProps {
  uniqueId: string
  formData: {
    work: string
    bio: string
  }
  setFormData: (updater: (prev: any) => any) => void
  isLoading: boolean
}

/**
 * About section fields for the profile edit form
 * @param props - Component props
 */
export function AboutFields({ uniqueId, formData, setFormData, isLoading }: AboutFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        About You
      </legend>

      <div className="space-y-2">
        <label htmlFor={`${uniqueId}-work`} className="text-sm font-medium block">
          Work <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`${uniqueId}-work`}
          type="text"
          placeholder="e.g., Software Engineer at Company"
          value={formData.work}
          onChange={e => {
            setFormData(prev => ({ ...prev, work: e.target.value }))
          }}
          disabled={isLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${uniqueId}-bio`} className="text-sm font-medium block">
          Bio <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={`${uniqueId}-bio`}
          placeholder="Tell us about yourself..."
          value={formData.bio}
          onChange={e => {
            if (e.target.value.length <= 160) {
              setFormData(prev => ({ ...prev, bio: e.target.value }))
            }
          }}
          disabled={isLoading}
          maxLength={160}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
        <CharacterCounter current={formData.bio.length} max={160} />
      </div>
    </fieldset>
  )
}
