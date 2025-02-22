const faqItems = [
  {
    question: 'What is llms.txt hub?',
    answer:
      "llms.txt hub is a central directory and resource center for websites and tools implementing the llms.txt standard, which helps AI models better understand and interact with your website's documentation and content structure."
  },
  {
    question: 'What is llms.txt?',
    answer:
      "llms.txt is a standard file that helps AI models better understand and interact with your website's documentation and content structure."
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
    question: 'How can I submit my website to llms.txt hub?',
    answer:
      "You can submit your website by clicking the 'Submit Your llms.txt' button on our homepage and following the submission process. Make sure you have implemented llms.txt on your site before submitting."
  }
]

export function FAQ() {
  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {faqItems.map((item, index) => (
          <div key={index} className="space-y-2">
            <h3 className="font-semibold">{item.question}</h3>
            <p className="text-sm text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
