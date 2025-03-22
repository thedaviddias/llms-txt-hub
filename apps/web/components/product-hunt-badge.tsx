import { Trophy } from 'lucide-react'

interface ProductHuntBadgeProps {
  type: 'product-of-the-day' | 'developer-tools'
}

export function ProductHuntBadge({ type }: ProductHuntBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-white text-[#DA552F] px-4 py-2 rounded-full text-sm font-medium">
      <Trophy className="size-4" />
      {type === 'product-of-the-day' ? '#1 Product of the Day' : '#1 Developer Tools'}
    </div>
  )
}
