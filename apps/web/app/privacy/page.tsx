import { Breadcrumb } from '@/components/breadcrumb'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - llms.txt hub',
  description: 'Privacy policy for the llms.txt hub website.'
}

export default function PrivacyPolicyPage() {
  const breadcrumbItems = [{ name: 'Privacy Policy', href: '/privacy' }]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <div className="prose dark:prose-invert">
          <p>Last updated: [Current Date]</p>
          <p>
            This Privacy Policy describes how llms.txt hub ("we", "us", or "our") collects, uses,
            and shares your personal information when you use our website (llmstxthub.com) and
            services.
          </p>
          <h2>Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account,
            submit content, or contact us for support. This may include your name, email address,
            and any other information you choose to provide.
          </p>
          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, to
            communicate with you, and to comply with legal obligations.
          </p>
          <h2>Information Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share your information with third-party
            service providers who perform services on our behalf, such as hosting and analytics.
          </p>
          <h2>Your Rights and Choices</h2>
          <p>
            You have the right to access, correct, or delete your personal information. You can do
            this by logging into your account or contacting us directly.
          </p>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page.
          </p>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at
            privacy@llmstxthub.com.
          </p>
        </div>
      </div>
    </div>
  )
}
