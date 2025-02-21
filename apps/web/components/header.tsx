"use client"

import { useState } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SearchBar } from "@/components/search-bar"
import { Search, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export function Header() {
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const { user, signIn, signOut } = useAuth()
  const router = useRouter()

  const handleSubmitClick = () => {
    if (!user) {
      router.push("/login?redirectTo=/submit")
    } else {
      router.push("/submit")
    }
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-medium">
            llms.txt hub
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <Link href="/news" className="text-sm text-muted-foreground hover:text-foreground">
              News
            </Link>
            <Link href="/resources" className="text-sm text-muted-foreground hover:text-foreground">
              Resources
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block w-[280px]">
            <SearchBar placeholder="Search by name, category, or token count..." className="h-9" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            {showMobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
          <Button variant="default" size="sm" onClick={handleSubmitClick}>
            Submit llms.txt
          </Button>
          <Button onClick={user ? signOut : signIn} variant="outline" size="sm">
            {user ? "Sign Out" : "Sign In with GitHub"}
          </Button>
          <ModeToggle />
        </div>
      </div>
      {showMobileSearch && (
        <div className="md:hidden px-4 py-2 border-t">
          <SearchBar placeholder="Search llms.txt hub..." />
        </div>
      )}
    </header>
  )
}

