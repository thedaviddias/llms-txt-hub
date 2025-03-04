import { Section } from '../layout/section'

export const faqItems = [
  {
    question: 'What is llms.txt Hub?',
    answer:
      "llms.txt Hub is a central directory and resource center for websites and tools implementing the llms.txt standard, which helps AI models better understand and interact with your website's documentation and content structure."
  },
  {
    question: 'What is llms.txt?',
    answer:
      "llms.txt is a proposed standard file that helps AI models better understand and interact with your website's documentation and content structure. It's similar to robots.txt, but specifically designed for AI language models."
  },
  {
    question: 'How do I implement llms.txt?',
    answer:
      "To implement llms.txt, create a file named 'llms.txt' in your website's root directory and define your content structure and AI interaction preferences."
  },
  {
    question: 'What are the benefits of using llms.txt?',
    answer:
      "Using llms.txt can improve AI's understanding of your content, enhance search capabilities, and provide better responses when AI tools interact with your documentation."
  },
  {
    question: 'How can I submit my website to llms.txt Hub?',
    answer:
      "You can submit your website by clicking the 'Submit Your llms.txt' button on our homepage and following the submission process. Make sure you have implemented llms.txt on your site before submitting."
  },
  {
    question: 'Is llms.txt required for all websites?',
    answer:
      "While llms.txt is not mandatory, it's highly recommended for websites that want to optimize their content for AI interactions. It's especially useful for documentation sites, blogs, and content-heavy platforms."
  },
  {
    question: 'How can I submit my website to the llms.txt Hub?',
    answer:
      "You can submit your website by clicking the 'Submit Your llms.txt' button on our homepage and following the submission process. Make sure you have implemented llms.txt on your site before submitting."
  },
  {
    question: 'Is the llms.txt Hub open source?',
    answer:
      "Yes, the llms.txt Hub is an open-source project. You can find our repository on GitHub and contribute to the project if you're interested."
  }
]

export function FAQSection() {
  return (
    <Section
      title="Frequently Asked Questions"
      description="Answers to common questions about llms.txt"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {faqItems.slice(0, 3).map((item, index) => (
          <div key={index} className="space-y-2">
            <h3 className="font-semibold">{item.question}</h3>
            <p className="text-sm text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
