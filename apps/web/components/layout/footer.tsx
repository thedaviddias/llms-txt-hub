import { getRoute } from '@/lib/routes'
import { SiGithub, SiReddit, SiX } from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import { ModeToggle } from '../mode-toggle'

export function Footer() {
  return (
    <footer className="border-t py-8 md:py-12">
      <h2 className="sr-only">Footer</h2>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
          <div className="space-y-3 md:col-span-2">
            <h3 className="font-semibold">llms.txt Hub</h3>
            <p className="text-sm text-muted-foreground">
              Discover AI-ready documentation and explore websites implementing the proposed{' '}
              <a href="https://llmstxt.org/" className="underline">
                llms.txt standard.
              </a>
            </p>
            <div className="flex space-x-4 mt-6">
              <ModeToggle />
              <div className="flex space-x-4">
                <Link href="https://github.com/thedaviddias" className="hover:text-foreground">
                  <SiGithub className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </Link>
                <Link href="https://www.reddit.com/r/llmstxt/" className="hover:text-foreground">
                  <SiReddit className="h-5 w-5" />
                  <span className="sr-only">Reddit</span>
                </Link>
                <Link href="https://x.com/llmstxthub" className="hover:text-foreground">
                  <SiX className="h-5 w-5" />
                  <span className="sr-only">X (Twitter)</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-medium mb-3">Directory</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={getRoute('website.list')} className="hover:text-foreground">
                    Websites
                  </Link>
                </li>
                <li>
                  <Link href={getRoute('guides.list')} className="hover:text-foreground">
                    Guides
                  </Link>
                </li>
                <li>
                  <Link href={getRoute('projects')} className="hover:text-foreground">
                    Projects
                  </Link>
                </li>
                <li>
                  <Link href={getRoute('faq')} className="hover:text-foreground">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Features</h4>
              <ul className="space-y-2 text-sm">
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
              <h4 className="font-medium mb-3">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={getRoute('about')} className="hover:text-foreground">
                    About
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
          </div>
        </div>
        <div className="mt-8 pt-6 border-t flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} llms.txt Hub. All rights reserved.</div>
          <div className="mt-4 md:mt-0">
            Made with ❤️ by{' '}
            <a
              href="https://thedaviddias.com"
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
