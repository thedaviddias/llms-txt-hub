import { TestimonialCard } from '@/components/testimonials/testimonial-card'

export function TestimonialsSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-center">What People Are Saying</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <TestimonialCard
          quote="llms.txt has revolutionized how we structure our AI documentation. It's a game-changer for developers and AI researchers alike."
          author="Dr. Jane Smith"
          position="AI Research Lead at TechCorp"
        />
        <TestimonialCard
          quote="Implementing llms.txt improved our AI model's understanding of our docs by 40%. It's now an essential part of our development process."
          author="John Doe"
          position="CTO of AI Innovations Inc."
        />
        <TestimonialCard
          quote="llms.txt has simplified our content management for AI consumption. It's the standard we've been waiting for in the AI documentation space."
          author="Emily Chen"
          position="Documentation Manager at AITech Solutions"
        />
      </div>
    </section>
  )
}
