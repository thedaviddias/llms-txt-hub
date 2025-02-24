import { getRoute } from '@/lib/routes'
import { Github, Linkedin, Twitter } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="font-semibold">llms.txt hub</h3>
            <p className="text-sm text-muted-foreground">
              Discover AI-ready documentation and explore websites implementing the llms.txt
              standard.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={getRoute('about')} className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href={getRoute('blog')} className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={getRoute('resources')} className="hover:text-foreground">
                  Resources
                </Link>
              </li>
              <li>
                <Link href={getRoute('llmsTxt')} className="hover:text-foreground">
                  llms.txt file
                </Link>
              </li>
              <li>
                <Link href={getRoute('submit')} className="hover:text-foreground">
                  Submit llms.txt
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3">Help</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={getRoute('faq')} className="hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href={getRoute('privacy')} className="hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={getRoute('terms')} className="hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3">Connect</h4>
            <div className="flex space-x-4">
              <Link href="https://github.com/thedaviddias" className="hover:text-foreground">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link href="https://x.com/thedaviddias" className="hover:text-foreground">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="https://linkedin.com/in/thedaviddias" className="hover:text-foreground">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t flex flex-col justify-between items-center text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} llms.txt hub. All rights reserved.</div>
          <div className="mt-4 md:mt-0">
            Made with ❤️ by{' '}
            <a
              href="https://ddias.link/blog"
              className="font-bold underline dark:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              David Dias
            </a>{' '}
            for the Open-Source Community.
          </div>
        </div>
      </div>
    </footer>
  )
}
