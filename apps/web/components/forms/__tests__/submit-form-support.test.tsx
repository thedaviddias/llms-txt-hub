import { SubmitFormSupport } from '@/components/forms/submit-form-support'
import { render, screen, userEvent } from '@/test/test-utils'

describe('SubmitFormSupport', () => {
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

    const xChoice = screen.getByRole('radio', { name: /support on x/i })
    const linkedInChoice = screen.getByRole('radio', { name: /support on linkedin/i })
    await user.click(xChoice)
    expect(xChoice).toBeChecked()
    await user.click(linkedInChoice)
    expect(linkedInChoice).toBeChecked()
    expect(xChoice).not.toBeChecked()
  })

  it('requires opening the selected profile before enabling the truthful attestation', async () => {
    const user = userEvent.setup()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={jest.fn()} />)

    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument()
    const confirmation = screen.getByRole('checkbox', {
      name: 'I follow David on this platform'
    })
    expect(confirmation).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /support on x/i }))
    expect(confirmation).toBeDisabled()
    await user.click(screen.getByRole('link', { name: /open david's x profile/i }))
    expect(confirmation).toBeEnabled()

    await user.click(screen.getByRole('radio', { name: /support on linkedin/i }))
    expect(confirmation).toBeDisabled()
    expect(confirmation).not.toBeChecked()
  })

  it('submits only after one opened platform is selected and attested', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={onSubmit} />)

    const submit = screen.getByRole('button', { name: /finish submission/i })
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /support on linkedin/i }))
    await user.click(screen.getByRole('link', { name: /open david's linkedin profile/i }))
    expect(submit).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'I follow David on this platform' }))
    expect(submit).toBeEnabled()
    await user.click(submit)

    expect(onSubmit).toHaveBeenCalledWith({ followAttested: true, platform: 'linkedin' })
  })

  it('can complete the support step using only the keyboard and accessible names', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<SubmitFormSupport isLoading={false} onBack={jest.fn()} onSubmit={onSubmit} />)

    const xChoice = screen.getByRole('radio', { name: /support on x/i })
    xChoice.focus()
    await user.keyboard('[Space]')
    const profile = screen.getByRole('link', { name: /open david's x profile/i })
    profile.focus()
    await user.keyboard('[Enter]')
    const confirmation = screen.getByRole('checkbox', {
      name: 'I follow David on this platform'
    })
    confirmation.focus()
    await user.keyboard('[Space]')
    const submit = screen.getByRole('button', { name: /finish submission/i })
    submit.focus()
    await user.keyboard('[Enter]')

    expect(onSubmit).toHaveBeenCalledWith({ followAttested: true, platform: 'x' })
  })
})
