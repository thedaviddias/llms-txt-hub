import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Card } from '@thedaviddias/design-system/card'

interface TestimonialCardProps {
  quote: string
  author: string
  position: string
  avatarSrc?: string
}

export function TestimonialCard({ quote, author, position, avatarSrc }: TestimonialCardProps) {
  return (
    <Card className="p-6 space-y-4">
      <p className="italic">"{quote}"</p>
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={avatarSrc} />
          <AvatarFallback>{author[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-sm text-muted-foreground">{position}</p>
        </div>
      </div>
    </Card>
  )
}
