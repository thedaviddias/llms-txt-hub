import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth, useUser } from './index'

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({
    signOut: vi.fn()
  }),
  useUser: () => ({
    user: {
      id: 'user_123',
      primaryEmailAddress: {
        emailAddress: 'david@example.com'
      },
      fullName: 'David Dias',
      username: 'thedaviddias',
      firstName: 'David',
      lastName: 'Dias',
      imageUrl: 'https://example.com/avatar.png',
      publicMetadata: {},
      externalAccounts: []
    },
    isLoaded: true,
    isSignedIn: true
  })
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

function AuthConsumer() {
  const auth = useAuth()

  return (
    <div>
      <span>{auth.user?.email}</span>
      <span>{String(auth.isSignedIn)}</span>
    </div>
  )
}

function UserConsumer() {
  const { user } = useUser()

  return <span>{user?.name}</span>
}

describe('@thedaviddias/auth/client', () => {
  it('exposes a Clerk-backed useAuth hook without requiring AuthProvider', () => {
    render(<AuthConsumer />)

    expect(screen.getByText('david@example.com')).toBeTruthy()
    expect(screen.getByText('true')).toBeTruthy()
  })

  it('exposes a Clerk-backed useUser hook without requiring AuthProvider', () => {
    render(<UserConsumer />)

    expect(screen.getByText('David Dias')).toBeTruthy()
  })
})
