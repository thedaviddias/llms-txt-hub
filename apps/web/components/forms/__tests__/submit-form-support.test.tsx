import { SubmitFormSupport } from '@/components/forms/submit-form-support'
import { render, screen, userEvent } from '@/test/test-utils'

describe('SubmitFormSupport', () => {
  it('focuses the exact support heading on mount', () => {
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={jest.fn()} />)

    const heading = screen.getByRole('heading', { name: 'Support the maintainer' })
    expect(heading).toHaveFocus()
    expect(heading).toHaveAttribute('tabindex', '-1')
  })

  it('offers the exact X and LinkedIn profiles as mutually exclusive choices', async () => {
    const user = userEvent.setup()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={jest.fn()} />)

    expect(screen.getByRole('link', { name: /open david's x profile/i })).toHaveAttribute(
      'href',
      'https://x.com/thedaviddias'
    )
    expect(screen.getByRole('link', { name: /open david's linkedin profile/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/thedaviddias/'
    )
    expect(screen.getAllByRole('link')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: '_blank' }),
        expect.objectContaining({ target: '_blank' })
      ])
    )

    const xChoice = screen.getByRole('radio', { name: 'Follow David on X' })
    const linkedInChoice = screen.getByRole('radio', { name: 'Follow David on LinkedIn' })
    const xCard = xChoice.closest('[data-support-card]')
    const linkedInCard = linkedInChoice.closest('[data-support-card]')
    expect(xCard).toHaveAttribute('data-state', 'unselected')
    await user.click(xChoice)
    expect(xChoice).toBeChecked()
    expect(xCard).toHaveAttribute('data-state', 'selected')
    expect(xCard).toHaveClass('border-primary', 'ring-2', 'bg-primary/5')
    await user.click(linkedInChoice)
    expect(linkedInChoice).toBeChecked()
    expect(xChoice).not.toBeChecked()
    expect(xCard).toHaveAttribute('data-state', 'unselected')
    expect(linkedInCard).toHaveAttribute('data-state', 'selected')
  })

  it('requires opening the selected profile before enabling the truthful attestation', async () => {
    const user = userEvent.setup()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={jest.fn()} />)

    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument()
    const confirmation = screen.getByRole('checkbox', {
      name: 'I follow David on this platform'
    })
    expect(confirmation).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'Follow David on X' }))
    expect(confirmation).toBeDisabled()
    await user.click(screen.getByRole('link', { name: /open david's x profile/i }))
    expect(confirmation).toBeEnabled()

    await user.click(screen.getByRole('radio', { name: 'Follow David on LinkedIn' }))
    expect(confirmation).toBeDisabled()
    expect(confirmation).not.toBeChecked()
  })

  it('submits only after one opened platform is selected and attested', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={onSubmit} />)

    const submit = screen.getByRole('button', { name: /finish submission/i })
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'Follow David on LinkedIn' }))
    await user.click(screen.getByRole('link', { name: /open david's linkedin profile/i }))
    expect(submit).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'I follow David on this platform' }))
    expect(submit).toBeEnabled()
    await user.click(submit)

    expect(onSubmit).toHaveBeenCalledWith({ followAttested: true, platform: 'linkedin' })
  })

  it('can complete the support step in DOM order using only the keyboard', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={onSubmit} />)

    const xChoice = screen.getByRole('radio', { name: 'Follow David on X' })
    await user.tab()
    expect(xChoice).toHaveFocus()
    await user.keyboard('[Space]')
    const profile = screen.getByRole('link', { name: /open david's x profile/i })
    await user.tab()
    expect(profile).toHaveFocus()
    await user.keyboard('[Enter]')
    const confirmation = screen.getByRole('checkbox', {
      name: 'I follow David on this platform'
    })
    await user.tab()
    await user.tab()
    expect(confirmation).toHaveFocus()
    await user.keyboard('[Space]')
    const submit = screen.getByRole('button', { name: /finish submission/i })
    const [back] = screen.getAllByRole('button')
    expect(back).toHaveTextContent('Back to details')
    await user.tab()
    expect(back).toHaveFocus()
    await user.tab()
    expect(submit).toHaveFocus()
    await user.keyboard('[Enter]')

    expect(onSubmit).toHaveBeenCalledWith({ followAttested: true, platform: 'x' })
  })
})
