import { NextRequest, NextResponse } from 'next/server'
import { scrapeStandings, scrapeMatches } from '@/lib/scraper'
import { 
  mockStandings, mockLiveMatches, mockRecentResults, mockUpcomingMatches,
  pslMockStandings, pslMockLiveMatches, pslMockRecentResults, pslMockUpcomingMatches 
} from '@/lib/mockData'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  let league = 'ipl'
  if (req && req.url) {
    const { searchParams } = new URL(req.url)
    league = searchParams.get('league') || 'ipl'
  }

  // Configs
  const configs: Record<string, { espnId: string, cbId: string, slug: string }> = {
    ipl: { espnId: '1510719', cbId: '9241', slug: 'indian-premier-league' },
    psl: { espnId: '1416478', cbId: '9143', slug: 'pakistan-super-league' }
  }

  const config = configs[league] || configs.ipl
  
  let standings = await scrapeStandings(config.espnId, config.slug, config.cbId)
  let matches = await scrapeMatches(config.espnId, config.slug, config.cbId)

  const usingMockData = !standings || !matches

  if (!standings) {
    standings = league === 'psl' ? pslMockStandings : mockStandings
  }

  if (!matches) {
    const mock = league === 'psl' 
      ? { live: pslMockLiveMatches, recent: pslMockRecentResults, upcoming: pslMockUpcomingMatches }
      : { live: mockLiveMatches, recent: mockRecentResults, upcoming: mockUpcomingMatches }
    matches = mock
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
