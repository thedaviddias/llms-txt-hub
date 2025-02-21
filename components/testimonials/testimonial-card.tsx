import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TestimonialCardProps {
  quote: string
  author: string
  role: string
  avatarSrc?: string
}

export function TestimonialCard({ quote, author, role, avatarSrc }: TestimonialCardProps) {
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
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </Card>
  )
}

