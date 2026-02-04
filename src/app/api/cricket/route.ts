import { NextResponse } from 'next/server'
import { scrapeStandings, scrapeMatches } from '@/lib/scraper'
import { mockStandings, mockTodayMatches, mockUpcomingMatches } from '@/lib/mockData'

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
    matches = { today: mockTodayMatches, upcoming: mockUpcomingMatches }
  }
  
  return NextResponse.json({
    standings,
    todayMatches: matches.today,
    upcomingMatches: matches.upcoming,
    usingMockData,
    lastUpdated: new Date().toISOString(),
  })
}
