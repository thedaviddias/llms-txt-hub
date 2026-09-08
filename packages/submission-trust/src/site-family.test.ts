import { describe, expect, it } from 'vitest'
import { areUrlsInSameSiteFamily } from '#site-family'
import { areUrlsInSameSiteFamily as serverSiteFamily } from '#url-policy'

describe('browser-safe site-family comparison', () => {
  it.each([
    ['https://example.com', 'https://docs.example.com/llms.txt', true],
    ['https://www.example.co.uk', 'https://docs.example.co.uk/llms.txt', true],
    ['https://example.com./path#fragment', 'https://docs.example.com/llms.txt', true],
    ['https://foo.github.io', 'https://docs.foo.github.io/llms.txt', true],
    ['https://foo.github.io', 'https://bar.github.io/llms.txt', false],
    ['https://example.com', 'https://unrelated.com/llms.txt', false],
    ['https://example.co.uk', 'https://unrelated.co.uk/llms.txt', false],
    ['not a URL', 'https://example.com', false],
    ['https://example.com', 'not a URL', false],
    ['https://example.com', 'http://docs.example.com/llms.txt', false],
    ['https://example.com', 'https://user:password@example.com/llms.txt', false],
    ['https://example.com', 'https://example.com:8443/llms.txt', false],
    ['https://example.com..', 'https://docs.example.com/llms.txt', false],
    ['https://8.8.8.8', 'https://8.8.8.8/llms.txt', false],
    ['https://[2606:4700:4700::1111]', 'https://[2606:4700:4700::1111]/llms.txt', false],
    ['', '', false]
  ])('matches server family policy for %s and %s', (website, llmsUrl, expected) => {
    expect(areUrlsInSameSiteFamily(website, llmsUrl)).toBe(expected)
    expect(serverSiteFamily(website, llmsUrl)).toBe(expected)
  })
})
