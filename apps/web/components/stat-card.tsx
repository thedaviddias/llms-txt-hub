import { Card } from '@thedaviddias/design-system/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
}

export function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-6 text-center">
      <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  )
}
