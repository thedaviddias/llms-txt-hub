interface CharacterCounterProps {
  current: number
  max: number
  className?: string
}

export function CharacterCounter({ current, max, className = '' }: CharacterCounterProps) {
  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      {current}/{max}
    </span>
  )
}
