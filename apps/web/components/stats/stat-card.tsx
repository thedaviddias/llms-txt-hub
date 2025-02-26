import { Card } from '@thedaviddias/design-system/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@thedaviddias/design-system/tooltip'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="p-6 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-help">
          <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-3xl font-bold">{value}</p>
        </Card>
      </TooltipTrigger>
      {description && (
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
