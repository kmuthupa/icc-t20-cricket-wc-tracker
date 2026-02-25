import { NextResponse } from 'next/server'
import { scrapeStandings, scrapeMatches } from '@/lib/scraper'
import { mockStandings, mockLiveMatches, mockRecentResults, mockUpcomingMatches } from '@/lib/mockData'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  let standings = await scrapeStandings()
  let matches = await scrapeMatches()

  const usingMockData = !standings || !matches

  if (!standings) {
    standings = mockStandings
  }

  if (!matches) {
    matches = { live: mockLiveMatches, recent: mockRecentResults, upcoming: mockUpcomingMatches }
  }

  return NextResponse.json({
    standings,
    liveMatches: matches.live,
    recentResults: matches.recent,
    upcomingMatches: matches.upcoming,
    usingMockData,
    lastUpdated: new Date().toISOString(),
  })
}
