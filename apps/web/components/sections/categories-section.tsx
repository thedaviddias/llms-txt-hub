import { CategoryList } from '@/components/category/category-list'
import { Section } from '@/components/layout/section'
export function CategoriesSection() {
  return (
    <Section title="Explore Categories">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CategoryList />
      </div>
    </Section>
  )
}
