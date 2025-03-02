import { SubmitForm } from '@/components/forms/submit-form'
import { render, screen } from '@/test/test-utils'

jest.mock('@/actions/submit-llms-xxt', () => ({
  submitLlmsTxt: jest.fn()
}))

describe('SubmitForm', () => {
  it('should render the initial form', () => {
    render(<SubmitForm />)
    expect(screen.getByText('Submit your llms.txt')).toBeInTheDocument()
  })
})
