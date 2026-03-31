import { scrapeMatches } from '../lib/scraper'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const SERIES_SLUG = 'indian-premier-league-2026'

function buildMatchLink(href: string, title: string): string {
  return `<a href="${href}" title="${title}">Match</a>`
}

function buildMatchesPage(links: string[]): string {
  return `<html><body>${links.join('\n')}</body></html>`
}

// ESPN API returns empty/error so tests exercise the Cricbuzz fallback path
function mockEspnFailCricbuzzSuccess(cricbuzzHtml: string) {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url.includes('hs-consumer-api.espncricinfo.com')) {
      return Promise.reject(new Error('ESPN unavailable'))
    }
    if (url.includes('/matches')) {
      return Promise.resolve({ data: cricbuzzHtml })
    }
    // Live score page
    return Promise.resolve({ data: '<html><body></body></html>' })
  })
}

describe('scrapeMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('separates live matches from completed and upcoming', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'Mumbai Indians vs Chennai Super Kings, 1st Match - Mumbai Indians won by 14 runs'
      ),
      buildMatchLink(
        `/live-cricket-scores/2/${SERIES_SLUG}/match2`,
        'Royal Challengers Bengaluru vs Kolkata Knight Riders, 2nd Match - Live'
      ),
      buildMatchLink(
        `/live-cricket-scores/3/${SERIES_SLUG}/match3`,
        'Delhi Capitals vs Rajasthan Royals, 3rd Match - Tomorrow, 14:00 IST'
      ),
    ])

    mockEspnFailCricbuzzSuccess(html)

    const result = await scrapeMatches()
    expect(result).not.toBeNull()

    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('Mumbai Indians')
    expect(result!.recent[0].status).toBe('completed')

    expect(result!.live).toHaveLength(1)
    expect(result!.live[0].team1).toBe('Royal Challengers Bengaluru')
    expect(result!.live[0].status).toBe('live')

    expect(result!.upcoming).toHaveLength(1)
    expect(result!.upcoming[0].team1).toBe('Delhi Capitals')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('puts completed matches into recent array, not live', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'Mumbai Indians vs Chennai Super Kings, 1st Match - Mumbai Indians won by 14 runs'
      ),
      buildMatchLink(
        `/live-cricket-scores/2/${SERIES_SLUG}/match2`,
        'Royal Challengers Bengaluru vs Kolkata Knight Riders, 2nd Match - Royal Challengers Bengaluru beat Kolkata Knight Riders'
      ),
      buildMatchLink(
        `/live-cricket-scores/3/${SERIES_SLUG}/match3`,
        'Delhi Capitals vs Rajasthan Royals, 3rd Match - Match abandoned'
      ),
    ])

    mockEspnFailCricbuzzSuccess(html)

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(0)
    expect(result!.recent).toHaveLength(3)
    expect(result!.upcoming).toHaveLength(0)

    expect(result!.recent[0].result).toBe('Mumbai Indians won by 14 runs')
    expect(result!.recent[1].result).toBe('Royal Challengers Bengaluru beat Kolkata Knight Riders')
    expect(result!.recent[2].result).toBe('Match abandoned')
  })

  it('limits recent results to 3', async () => {
    const links = Array.from({ length: 6 }, (_, i) =>
      buildMatchLink(
        `/live-cricket-scores/${i}/${SERIES_SLUG}/match${i}`,
        `Team${i}A vs Team${i}B, Match ${i} - Team${i}A won by ${i + 1} runs`
      )
    )

    mockEspnFailCricbuzzSuccess(buildMatchesPage(links))

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.recent).toHaveLength(3)
  })

  it('limits upcoming matches to 6', async () => {
    const links = Array.from({ length: 10 }, (_, i) =>
      buildMatchLink(
        `/live-cricket-scores/${i}/${SERIES_SLUG}/match${i}`,
        `Team${i}A vs Team${i}B, Match ${i} - Tomorrow ${i}:00`
      )
    )

    mockEspnFailCricbuzzSuccess(buildMatchesPage(links))

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.upcoming).toHaveLength(6)
  })

  it('limits live matches to 5', async () => {
    const links = Array.from({ length: 8 }, (_, i) =>
      buildMatchLink(
        `/live-cricket-scores/${i}/${SERIES_SLUG}/match${i}`,
        `Team${i}A vs Team${i}B, Match ${i} - Live`
      )
    )

    mockEspnFailCricbuzzSuccess(buildMatchesPage(links))

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(5)
  })

  it('skips duplicate hrefs', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'Mumbai Indians vs Chennai Super Kings, 1st Match - Live'
      ),
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'Mumbai Indians vs Chennai Super Kings, 1st Match - Live'
      ),
    ])

    mockEspnFailCricbuzzSuccess(html)

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(1)
  })

  it('skips non-IPL matches', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        '/live-cricket-scores/1/some-other-series/match1',
        'India vs Australia, Test Match - Live'
      ),
    ])

    mockEspnFailCricbuzzSuccess(html)

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(0)
    expect(result!.recent).toHaveLength(0)
    expect(result!.upcoming).toHaveLength(0)
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'))

    const result = await scrapeMatches()
    expect(result).toBeNull()
  })

  it('sets result text only for completed matches', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'Mumbai Indians vs Chennai Super Kings, 1st Match - Mumbai Indians won by 14 runs'
      ),
      buildMatchLink(
        `/live-cricket-scores/2/${SERIES_SLUG}/match2`,
        'Royal Challengers Bengaluru vs Kolkata Knight Riders, 2nd Match - Live'
      ),
      buildMatchLink(
        `/live-cricket-scores/3/${SERIES_SLUG}/match3`,
        'Delhi Capitals vs Rajasthan Royals, 3rd Match - Tomorrow 14:00'
      ),
    ])

    mockEspnFailCricbuzzSuccess(html)

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.recent[0].result).toBe('Mumbai Indians won by 14 runs')
    expect(result!.live[0].result).toBeUndefined()
    expect(result!.upcoming[0].result).toBeUndefined()
  })
})
