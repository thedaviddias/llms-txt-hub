type SectionProps = {
  title: string
  description?: string
  children: React.ReactNode
}

export function Section({ children, title, description }: SectionProps) {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-center">{title}</h2>
        {description && <p className="text-xl text-muted-foreground text-center">{description}</p>}
      </div>
      {children}
    </section>
  )
}
