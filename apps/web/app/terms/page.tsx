import { Breadcrumb } from '@/components/breadcrumb'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - llms.txt hub',
  description: 'Terms of service for the llms.txt hub website.'
}

export default function TermsOfServicePage() {
  const breadcrumbItems = [{ name: 'Terms of Service', href: '/terms' }]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <div className="prose dark:prose-invert">
          <p>Last updated: [Current Date]</p>
          <p>
            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using
            the llms.txt hub website (llmstxthub.com) operated by llms.txt hub ("us", "we", or
            "our").
          </p>
          <h2>1. Terms</h2>
          <p>
            By accessing the website, you agree to be bound by these Terms of Service and all
            applicable laws and regulations. If you do not agree with any part of these terms, you
            may not use our website.
          </p>
          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or
            software) on llms.txt hub's website for personal, non-commercial transitory viewing
            only.
          </p>
          <h2>3. Disclaimer</h2>
          <p>
            The materials on llms.txt hub's website are provided on an 'as is' basis. llms.txt hub
            makes no warranties, expressed or implied, and hereby disclaims and negates all other
            warranties including, without limitation, implied warranties or conditions of
            merchantability, fitness for a particular purpose, or non-infringement of intellectual
            property or other violation of rights.
          </p>
          <h2>4. Limitations</h2>
          <p>
            In no event shall llms.txt hub or its suppliers be liable for any damages (including,
            without limitation, damages for loss of data or profit, or due to business interruption)
            arising out of the use or inability to use the materials on llms.txt hub's website.
          </p>
          <h2>5. Revisions and Errata</h2>
          <p>
            The materials appearing on llms.txt hub's website could include technical,
            typographical, or photographic errors. llms.txt hub does not warrant that any of the
            materials on its website are accurate, complete or current.
          </p>
          <h2>6. Links</h2>
          <p>
            llms.txt hub has not reviewed all of the sites linked to its website and is not
            responsible for the contents of any such linked site. The inclusion of any link does not
            imply endorsement by llms.txt hub of the site. Use of any such linked website is at the
            user's own risk.
          </p>
          <h2>7. Modifications</h2>
          <p>
            llms.txt hub may revise these terms of service for its website at any time without
            notice. By using this website you are agreeing to be bound by the then current version
            of these Terms of Service.
          </p>
          <h2>8. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws of
            [Your Country/State] and you irrevocably submit to the exclusive jurisdiction of the
            courts in that State or location.
          </p>
        </div>
      </div>
    </div>
  )
}
