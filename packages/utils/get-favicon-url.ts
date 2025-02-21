export function getFaviconUrl(website: string) {
  const domain = new URL(website).hostname
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}
