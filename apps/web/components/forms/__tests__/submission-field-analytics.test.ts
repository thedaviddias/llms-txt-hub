import {
  submissionFieldState,
  submissionFieldStates
} from '@/components/forms/submission-field-analytics'

describe('submissionFieldStates', () => {
  it('ignores unknown fields and exposes only aggregate state for known fields', () => {
    expect(submissionFieldState('secretField', 'private', true)).toBeUndefined()
    expect(submissionFieldState('category', 'developer-tools', true)).toEqual({
      fieldName: 'category',
      modified: true,
      provided: true,
      required: true
    })
  })

  it('returns only aggregate provided and modified state for allowlisted fields', () => {
    const states = submissionFieldStates(
      {
        category: 'developer-tools',
        description: 'A description long enough to be valid and end with a period.',
        llmsFullUrl: '',
        llmsUrl: 'https://private.example/llms.txt',
        mdxContent: 'Private additional content',
        name: 'Private project',
        website: 'https://private.example'
      },
      { category: true, description: true, mdxContent: true, name: true }
    )

    expect(states).toEqual([
      { fieldName: 'website', modified: false, provided: true, required: true },
      { fieldName: 'name', modified: true, provided: true, required: true },
      { fieldName: 'description', modified: true, provided: true, required: true },
      { fieldName: 'category', modified: true, provided: true, required: true },
      { fieldName: 'llms_url', modified: false, provided: true, required: true },
      { fieldName: 'llms_full_url', modified: false, provided: false, required: false },
      { fieldName: 'additional_content', modified: true, provided: true, required: false }
    ])
    expect(JSON.stringify(states)).not.toMatch(/private|developer-tools|long enough/i)
  })
})
