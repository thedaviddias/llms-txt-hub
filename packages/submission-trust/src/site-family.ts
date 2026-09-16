import { getDomain } from 'tldts'

const getUrlSiteFamily = (value: string): string | null => {
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      /\.{2,}$/.test(url.hostname)
    ) {
      return null
    }

    return getDomain(url.hostname.replace(/\.$/, ''), {
      allowPrivateDomains: true,
      extractHostname: false
    })
  } catch {
    return null
  }
}

/**
 * Compares HTTPS URL site families without Node dependencies, isolating private
 * suffix tenants such as distinct github.io sites. Server callers must also apply
 * the submission URL and network policies before inspecting either resource.
 */
export const areUrlsInSameSiteFamily = (left: string, right: string): boolean => {
  const leftFamily = getUrlSiteFamily(left)
  const rightFamily = getUrlSiteFamily(right)
  return leftFamily !== null && leftFamily === rightFamily
}
