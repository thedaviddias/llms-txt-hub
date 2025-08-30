'use client'

interface BasicInfoFieldsProps {
  uniqueId: string
  formData: {
    firstName: string
    lastName: string
    username: string
  }
  setFormData: (updater: (prev: any) => any) => void
  isLoading: boolean
  usernameError: string
  isCheckingUsername: boolean
}

/**
 * Basic information fields for the profile edit form
 * @param props - Component props
 */
export function BasicInfoFields({
  uniqueId,
  formData,
  setFormData,
  isLoading,
  usernameError,
  isCheckingUsername
}: BasicInfoFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Basic Information
      </legend>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={`${uniqueId}-firstName`} className="text-sm font-medium block">
            First Name <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id={`${uniqueId}-firstName`}
            type="text"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={e => {
              setFormData(prev => ({ ...prev, firstName: e.target.value }))
            }}
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${uniqueId}-lastName`} className="text-sm font-medium block">
            Last Name <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id={`${uniqueId}-lastName`}
            type="text"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={e => {
              setFormData(prev => ({ ...prev, lastName: e.target.value }))
            }}
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${uniqueId}-username`} className="text-sm font-medium block">
          Username <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`${uniqueId}-username`}
          type="text"
          placeholder="Choose a unique username"
          value={formData.username}
          onChange={e => {
            const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
            setFormData(prev => ({ ...prev, username: value }))
          }}
          disabled={isLoading}
          className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            usernameError ? 'border-destructive' : 'border-input'
          }`}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Used for your profile URL: /u/{formData.username || 'username'}
          </p>
          {isCheckingUsername && <span className="text-xs text-muted-foreground">Checking...</span>}
        </div>
        {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
      </div>
    </fieldset>
  )
}
