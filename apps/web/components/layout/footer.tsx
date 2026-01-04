import { SiGithub, SiReddit, SiX } from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'
import { getRoute } from '@/lib/routes'

/**
 * Footer component with site navigation and external links
 * Features: Bold typography, refined spacing, clean layout
 */
export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 md:py-16 bg-muted/30">
      <h2 className="sr-only">Footer</h2>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 md:gap-12">
          <div className="space-y-4 md:col-span-2">
            <h3 className="font-bold text-lg tracking-tight">llms.txt hub</h3>
            <p className="text-sm text-muted-foreground">
              Discover AI-ready documentation and explore websites implementing the proposed{' '}
              <a
                href="https://llmstxt.org/"
                className="underline plausible-event-name=External+Link+Click"
                target="_blank"
                rel="noopener noreferrer"
              >
                llms.txt standard.
              </a>
            </p>
            <div className="flex items-center gap-1 my-6">
              <ModeToggle />
              <Link
                href="https://github.com/thedaviddias/llms-txt-hub"
                className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors plausible-event-name=Social+Link+Click plausible-event-platform=GitHub plausible-event-source=Footer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiGithub className="size-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link
                href="https://www.reddit.com/r/llmstxt/"
                className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors plausible-event-name=Social+Link+Click plausible-event-platform=Reddit plausible-event-source=Footer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiReddit className="size-5" />
                <span className="sr-only">Reddit</span>
              </Link>
              <Link
                href="https://x.com/llmstxthub"
                className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors plausible-event-name=Social+Link+Click plausible-event-platform=Twitter plausible-event-source=Footer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiX className="size-5" />
                <span className="sr-only">X (Twitter)</span>
              </Link>
            </div>
            <a
              title="Install llms-txt Raycast Extension"
              href="https://www.raycast.com/thedaviddias/llms-txt"
              className="plausible-event-name=Tool+Click"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://www.raycast.com/thedaviddias/llms-txt/install_button@2x.png"
                height={64}
                alt="Install llms-txt Raycast Extension"
                style={{ height: '64px' }}
              />
            </a>
          </div>
          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Directory
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={getRoute('projects')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    Projects
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('guides.list')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('members.list')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    Members
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('news')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    News
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('faq')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Features
              </h4>
              <ul className="space-y-2 text-sm">
                {/* <li>
                  <Link href={getRoute('llmsTxt')} className="hover:text-foreground">
                    llms.txt file
                  </Link>
                </li> */}
                <li>
                  <Link
                    href={getRoute('submit')}
                    className="hover:text-foreground plausible-event-name=Submit+Website"
                  >
                    Submit llms.txt
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Resources
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={getRoute('about')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('privacy')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('terms')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href={getRoute('cookies')}
                    className="hover:text-foreground plausible-event-name=External+Link+Click"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div className="font-medium">
            © {new Date().getFullYear()} llms.txt hub. All rights reserved.
          </div>
          <div className="mt-4 md:mt-0">
            Made with ❤️ by{' '}
            <a
              href="https://thedaviddias.com"
              className="font-bold text-foreground hover:underline transition-colors plausible-event-name=External+Link+Click"
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
