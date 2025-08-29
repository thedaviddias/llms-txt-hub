'use client'

interface LinksFieldsProps {
  uniqueId: string
  formData: {
    linkedin: string
    website: string
  }
  setFormData: (updater: (prev: any) => any) => void
  isLoading: boolean
}

/**
 * Links & Social fields for the profile edit form
 * @param props - Component props
 */
export function LinksFields({ uniqueId, formData, setFormData, isLoading }: LinksFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Links & Social
      </legend>

      <div className="space-y-2">
        <label htmlFor={`${uniqueId}-linkedin`} className="text-sm font-medium block">
          LinkedIn <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`${uniqueId}-linkedin`}
          type="url"
          placeholder="https://linkedin.com/in/yourname"
          value={formData.linkedin}
          onChange={e => {
            setFormData(prev => ({ ...prev, linkedin: e.target.value }))
          }}
          disabled={isLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${uniqueId}-website`} className="text-sm font-medium block">
          Website <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`${uniqueId}-website`}
          type="url"
          placeholder="https://yourwebsite.com"
          value={formData.website}
          onChange={e => {
            setFormData(prev => ({ ...prev, website: e.target.value }))
          }}
          disabled={isLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </fieldset>
  )
}
