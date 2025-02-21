import Link from "next/link"
import { Book, Code2, Video } from "lucide-react"

const resourceTypes = [
  { name: "All", icon: Book, slug: "all" },
  { name: "Articles", icon: Book, slug: "articles" },
  { name: "Tutorials", icon: Video, slug: "tutorials" },
  { name: "Open Source Projects", icon: Code2, slug: "open-source" },
]

export function ResourcesSidebar() {
  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="sticky top-8 space-y-2">
        <h2 className="text-lg font-semibold mb-4">Resource Types</h2>
        {resourceTypes.map((type) => (
          <Link
            key={type.slug}
            href={`/resources/${type.slug === "all" ? "" : type.slug}`}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
          >
            <type.icon className="h-5 w-5" />
            <span>{type.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

