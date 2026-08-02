import { SubmitFormSuccess } from '@/components/forms/submit-form-success'
import { render, screen } from '@/test/test-utils'

describe('SubmitFormSuccess', () => {
  it('renders back-to-home as one interactive link', () => {
    render(
      <SubmitFormSuccess
        result={{
          outcome: 'manual',
          prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123'
        }}
        onSubmitAnother={jest.fn()}
      />
    )

    const home = screen.getByRole('link', { name: /back to home/i })
    expect(home.tagName).toBe('A')
    expect(home.querySelector('button')).toBeNull()
  })
})
