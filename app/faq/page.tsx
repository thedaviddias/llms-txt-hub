import type { Metadata } from "next"
import { Breadcrumb } from "@/components/breadcrumb"

export const metadata: Metadata = {
  title: "FAQ - llms.txt hub",
  description: "Frequently asked questions about llms.txt and the llms.txt hub.",
}

const faqItems = [
  {
    question: "What is llms.txt?",
    answer:
      "llms.txt is a standard file that helps AI models better understand and interact with your website's documentation and content structure. It's similar to robots.txt, but specifically designed for AI language models.",
  },
  {
    question: "How do I implement llms.txt on my website?",
    answer:
      "To implement llms.txt, create a file named 'llms.txt' in your website's root directory and define your content structure and AI interaction preferences. You can find detailed implementation guidelines in our documentation.",
  },
  {
    question: "What are the benefits of using llms.txt?",
    answer:
      "Using llms.txt can improve AI's understanding of your content, enhance search capabilities, and provide better responses when AI tools interact with your documentation. It helps ensure that AI models interpret your content correctly.",
  },
  {
    question: "Is llms.txt required for all websites?",
    answer:
      "While llms.txt is not mandatory, it's highly recommended for websites that want to optimize their content for AI interactions. It's especially useful for documentation sites, blogs, and content-heavy platforms.",
  },
  {
    question: "How can I submit my website to the llms.txt hub?",
    answer:
      "You can submit your website by clicking the 'Submit Your llms.txt' button on our homepage and following the submission process. Make sure you have implemented llms.txt on your site before submitting.",
  },
  {
    question: "Is the llms.txt hub open source?",
    answer:
      "Yes, the llms.txt hub is an open-source project. You can find our repository on GitHub and contribute to the project if you're interested.",
  },
]

export default function FAQPage() {
  const breadcrumbItems = [{ name: "FAQ", href: "/faq" }]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <div className="space-y-6">
          {faqItems.map((item, index) => (
            <div key={index} className="space-y-2">
              <h2 className="text-xl font-semibold">{item.question}</h2>
              <p className="text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

