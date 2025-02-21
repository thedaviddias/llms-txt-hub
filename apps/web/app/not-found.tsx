import Link from 'next/link'

import { Button } from '@thedaviddias/design-system/button'

export default async function NotFound() {
  return (
    <main className="mx-auto relative container flex flex-col items-center justify-center px-4">
      <div className="mx-auto flex h-screen flex-col items-center justify-center">
        <div className="flex h-full flex-col items-center justify-center">
          <span className="not-found rounded-md px-3.5 py-1 text-sm font-medium dark:text-neutral-50">
            404
          </span>
          <h1 className="mt-5 text-3xl font-bold dark:text-neutral-50 md:text-5xl">Not Found</h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-base font-medium text-neutral-400">
            The page you are looking for does not exist. <br /> But don&apos;t worry, we&apos;ve got
            you covered. You can{' '}
            <Link
              href="https://github.com/thedaviddias/david-dias-world/issues/new/choose"
              className="text-foreground"
            >
              contact us or report an issue
            </Link>
            .
          </p>
          <Link href={`/`}>
            <Button className="mt-8">Back to homepage</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
