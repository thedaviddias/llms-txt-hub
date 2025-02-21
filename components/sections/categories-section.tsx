import { CategoryList } from "@/components/category-list"

export function CategoriesSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold">Explore Categories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CategoryList />
      </div>
    </section>
  )
}

