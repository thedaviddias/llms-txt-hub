type SectionProps = {
  title: string
  description?: string
  children: React.ReactNode
}

export function Section({ children, title, description }: SectionProps) {
  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-center">{title}</h2>
        {description && <p className="text-md text-muted-foreground text-center">{description}</p>}
      </div>
      {children}
    </section>
  )
}
