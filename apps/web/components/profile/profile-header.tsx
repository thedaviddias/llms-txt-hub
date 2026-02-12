'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { Briefcase, Calendar, Edit, Eye, EyeOff, FileText, Github, Globe } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { getMemberBadgeSync } from '@/lib/member-client-utils'
import { escapeHtml } from '@/lib/security-utils'
import { EditProfileModal } from './edit-profile-modal'

interface ProfileHeaderProps {
  profileUser: {
    id?: string
    firstName?: string | null
    lastName?: string | null
    username?: string | null
    imageUrl?: string | null
    createdAt: string | number
  }
  displayName: string
  username?: string | null
  githubUsername?: string | null
  bio?: string | null
  work?: string | null
  website?: string | null
  joinDate: string
  isOwnProfile: boolean
  hasContributions?: boolean
  isProfilePrivate?: boolean
  isProfileIncomplete?: boolean
}

/**
 * Header component displaying user profile information
 * @param props - Component props
 */
export function ProfileHeader({
  profileUser,
  displayName,
  username,
  githubUsername,
  bio,
  work,
  website,
  joinDate,
  isOwnProfile,
  hasContributions,
  isProfilePrivate,
  isProfileIncomplete
}: ProfileHeaderProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const badge = getMemberBadgeSync(hasContributions)

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-shrink-0">
          <Link href={`/u/${profileUser.username || profileUser.id || ''}`}>
            <Avatar className="w-24 h-24 md:w-32 md:h-32 cursor-pointer hover:opacity-90 transition-opacity">
              {profileUser.imageUrl ? (
                <AvatarImage
                  src={profileUser.imageUrl}
                  alt={`${displayName}'s profile picture - llms.txt hub community member`}
                />
              ) : (
                <AvatarFallback className="text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
        </div>

        <div className="flex-grow">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-grow">
              <Link href={`/u/${profileUser.username || profileUser.id || ''}`}>
                <h1 className="text-2xl md:text-3xl font-bold hover:text-primary transition-colors cursor-pointer">
                  {displayName}
                </h1>
              </Link>
              <div className="flex items-center gap-3 mt-1">
                {username && (
                  <>
                    <p className="text-lg text-muted-foreground">@{username}</p>
                    <Badge variant={badge.variant} className="text-xs">
                      {badge.label}
                    </Badge>
                    {isOwnProfile && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          isProfileIncomplete
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isProfilePrivate
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isProfileIncomplete ? (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden (Incomplete)
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
                    )}
                    {githubUsername && (
                      <Link
                        href={`https://github.com/${githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`View ${githubUsername}'s GitHub profile`}
                      >
                        <Github className="w-4 h-4" />
                        <span className="text-xs">@{githubUsername}</span>
                      </Link>
                    )}
                  </>
                )}
                {!username && (
                  <>
                    <Badge variant={badge.variant} className="text-xs">
                      {badge.label}
                    </Badge>
                    {isOwnProfile && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          isProfileIncomplete
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isProfilePrivate
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isProfileIncomplete ? (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden (Incomplete)
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
                    )}
                  </>
                )}
              </div>
              {bio && <p className="text-sm mt-3 max-w-2xl">{escapeHtml(bio)}</p>}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {joinDate}</span>
                </div>
                {work && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    <span>{escapeHtml(work)}</span>
                  </div>
                )}
                {website && (
                  <Link
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </Link>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <div className="flex flex-shrink-0 gap-3 mt-4 md:mt-0">
                <Button variant="default" size="default" onClick={() => setShowEditModal(true)}>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
                <Button variant="secondary" size="default" asChild>
                  <Link href="/submit">
                    <FileText className="w-4 h-4" />
                    Submit llms.txt
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwnProfile && <EditProfileModal open={showEditModal} onOpenChange={setShowEditModal} />}
    </>
  )
}
