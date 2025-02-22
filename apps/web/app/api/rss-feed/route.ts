import { XMLParser } from 'fast-xml-parser'
import { NextResponse } from 'next/server'

const RSS_FEED_URL = 'https://bg.raindrop.io/rss/public/52790163'

export async function GET() {
  try {
    const response = await fetch(RSS_FEED_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch RSS feed')
    }

    const xmlData = await response.text()
    const parser = new XMLParser()
    const result = parser.parse(xmlData)

    const items = result.rss.channel.item.map((item: any) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      description: item.description
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch or parse RSS feed:', error)
    return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 500 })
  }
}
