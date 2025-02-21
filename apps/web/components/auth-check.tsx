"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

interface AuthCheckProps {
  children: React.ReactNode
}

export function AuthCheck({ children }: AuthCheckProps) {
  const { user, signIn } = useAuth()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Sign in to submit your llms.txt</h2>
        <p className="text-muted-foreground">You need to be signed in with GitHub to submit your llms.txt file.</p>
        <Button onClick={signIn} className="w-full max-w-sm">
          <Github className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

