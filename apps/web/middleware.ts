import { middleware } from '@thedaviddias/auth'

export const config = {
  matcher:
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|llms.txt|opengraph-image.png|sitemap.xml|.*\\.).*)$'
}

export { middleware }
