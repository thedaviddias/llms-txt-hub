'use client'
import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@thedaviddias/design-system/dropdown-menu'
import { Eye, EyeOff, LogOut, Plus, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { AuthTierIndicator } from '@/components/auth/auth-tier-indicator'
import { getRoute } from '@/lib/routes'

interface UserDropdownMenuProps {
  user: any
  userSlug: string
  isProfilePrivate: boolean
  needsNameOrUsername: boolean
  onSignOut: () => void
}

/**
 * User dropdown menu component
 *
 * @param user - User object from auth
 * @param userSlug - User slug for profile link
 * @param isProfilePrivate - Whether profile is private
 * @param needsNameOrUsername - Whether user needs to complete profile
 * @param onSignOut - Sign out handler
 * @returns JSX.Element - User dropdown menu
 */
export function UserDropdownMenu({
  user,
  userSlug,
  isProfilePrivate,
  needsNameOrUsername,
  onSignOut
}: UserDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="cursor-pointer h-8 w-8 rounded-full">
          {user.user_metadata?.avatar_url ? (
            <AvatarImage src={user.user_metadata.avatar_url} alt={user.name || 'User avatar'} />
          ) : (
            <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* User Info Section */}
        <div className="px-3 py-3">
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium truncate">{user.name}</p>}
            {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
            <div className="pt-2">
              <AuthTierIndicator compact={true} showUpgrade={false} />
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />
        {/* Navigation Items */}
        <div className="py-1">
          <DropdownMenuItem asChild className="p-0">
            <Link
              href={`/u/${userSlug}`}
              className="flex w-full items-center px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150 cursor-pointer plausible-event-name=Member+Profile+Click"
            >
              <User className="mr-3 h-4 w-4" />
              <span className="cursor-pointer">Profile</span>
              <Badge
                variant="outline"
                className={`ml-auto text-xs ${
                  needsNameOrUsername
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : isProfilePrivate
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {needsNameOrUsername ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Hidden
                  </>
                ) : isProfilePrivate ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Private
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Public
                  </>
                )}
              </Badge>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="p-0">
            <Link
              href={getRoute('submit')}
              className="flex w-full items-center px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150 cursor-pointer plausible-event-name=Submit+Project"
            >
              <Plus className="mr-3 h-4 w-4" />
              <span className="cursor-pointer">Add your llms.txt</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="p-0">
            <Link
              href="/settings"
              className="flex w-full items-center px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150 cursor-pointer plausible-event-name=Settings"
            >
              <Settings className="mr-3 h-4 w-4" />
              <span className="cursor-pointer">Settings</span>
            </Link>
          </DropdownMenuItem>
        </div>

        <div className="h-px bg-border mx-2" />

        {/* Danger Zone */}
        <div className="py-1">
          <DropdownMenuItem
            onClick={onSignOut}
            className="text-destructive focus:text-destructive focus:bg-destructive/20 hover:bg-destructive/20 hover:text-destructive mx-2 my-1 px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
