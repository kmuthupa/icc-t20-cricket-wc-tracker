import { scrapeStandings, scrapeMatches } from '@/lib/scraper'
import { mockStandings, mockTodayMatches, mockUpcomingMatches } from '@/lib/mockData'

jest.mock('@/lib/scraper')
const mockedScrapeStandings = scrapeStandings as jest.MockedFunction<typeof scrapeStandings>
const mockedScrapeMatches = scrapeMatches as jest.MockedFunction<typeof scrapeMatches>

// Mock NextResponse since we're outside Next.js runtime
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown) => ({
      json: async () => body,
      body,
    }),
  },
}))

// Import after mocks are set up
import { GET } from '../cricket/route'

describe('GET /api/cricket', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns live data with usingMockData: false when scraping succeeds', async () => {
    const liveStandings = [{ group: 'Group A', teams: [{ position: 1, team: 'India', played: 1, won: 1, lost: 0, nrr: '+1.500', points: 2 }] }]
    const liveMatches = {
      today: [{ id: '1', team1: 'India', team2: 'Australia', venue: 'MCG', time: '', status: 'live' as const }],
      upcoming: [],
    }

    mockedScrapeStandings.mockResolvedValueOnce(liveStandings)
    mockedScrapeMatches.mockResolvedValueOnce(liveMatches)

    const response = await GET()
    const data = await response.json()

    expect(data.usingMockData).toBe(false)
    expect(data.standings).toEqual(liveStandings)
    expect(data.todayMatches).toEqual(liveMatches.today)
    expect(data.upcomingMatches).toEqual(liveMatches.upcoming)
  })

  it('falls back to mock data when scraping fails', async () => {
    mockedScrapeStandings.mockResolvedValueOnce(null)
    mockedScrapeMatches.mockResolvedValueOnce(null)

    const response = await GET()
    const data = await response.json()

    expect(data.usingMockData).toBe(true)
    expect(data.standings).toEqual(mockStandings)
    expect(data.todayMatches).toEqual(mockTodayMatches)
    expect(data.upcomingMatches).toEqual(mockUpcomingMatches)
  })

  it('sets usingMockData: true and uses mock standings when only standings fails', async () => {
    mockedScrapeStandings.mockResolvedValueOnce(null)
    mockedScrapeMatches.mockResolvedValueOnce({ today: [], upcoming: [] })

    const response = await GET()
    const data = await response.json()

    expect(data.usingMockData).toBe(true)
    expect(data.standings).toEqual(mockStandings)
    expect(data.todayMatches).toEqual([])
  })

  it('sets usingMockData: true and uses mock matches when only matches fails', async () => {
    const liveStandings = [{ group: 'Super 8 Group 1', teams: [] }]
    mockedScrapeStandings.mockResolvedValueOnce(liveStandings)
    mockedScrapeMatches.mockResolvedValueOnce(null)

    const response = await GET()
    const data = await response.json()

    expect(data.usingMockData).toBe(true)
    expect(data.standings).toEqual(liveStandings)
    expect(data.todayMatches).toEqual(mockTodayMatches)
    expect(data.upcomingMatches).toEqual(mockUpcomingMatches)
  })

  it('response shape matches expected interface', async () => {
    mockedScrapeStandings.mockResolvedValueOnce(null)
    mockedScrapeMatches.mockResolvedValueOnce(null)

    const response = await GET()
    const data = await response.json()

    expect(data).toHaveProperty('standings')
    expect(data).toHaveProperty('todayMatches')
    expect(data).toHaveProperty('upcomingMatches')
    expect(data).toHaveProperty('usingMockData')
    expect(data).toHaveProperty('lastUpdated')
    expect(typeof data.lastUpdated).toBe('string')
    // lastUpdated should be a valid ISO date
    expect(new Date(data.lastUpdated).toISOString()).toBe(data.lastUpdated)
  })
})
