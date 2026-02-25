import { scrapeMatches } from '../lib/scraper'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const SERIES_SLUG = 'icc-mens-t20-world-cup-2026'

function buildMatchLink(href: string, title: string): string {
  return `<a href="${href}" title="${title}">Match</a>`
}

function buildMatchesPage(links: string[]): string {
  return `<html><body>${links.join('\n')}</body></html>`
}

describe('scrapeMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('separates live matches from completed and upcoming', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'India vs Australia, 1st Match - India won by 14 runs'
      ),
      buildMatchLink(
        `/live-cricket-scores/2/${SERIES_SLUG}/match2`,
        'England vs South Africa, 2nd Match - Live'
      ),
      buildMatchLink(
        `/live-cricket-scores/3/${SERIES_SLUG}/match3`,
        'Pakistan vs New Zealand, 3rd Match - Tomorrow, 14:00 IST'
      ),
    ])

    // First call: matches page, second call: live score page
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/matches')) {
        return Promise.resolve({ data: html })
      }
      // Live score page - return minimal HTML
      return Promise.resolve({ data: '<html><body></body></html>' })
    })

    const result = await scrapeMatches()
    expect(result).not.toBeNull()

    // India won = completed -> recent
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('India')
    expect(result!.recent[0].status).toBe('completed')

    // England Live -> live
    expect(result!.live).toHaveLength(1)
    expect(result!.live[0].team1).toBe('England')
    expect(result!.live[0].status).toBe('live')

    // Pakistan Tomorrow -> upcoming
    expect(result!.upcoming).toHaveLength(1)
    expect(result!.upcoming[0].team1).toBe('Pakistan')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('puts completed matches into recent array, not live', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'India vs Australia, 1st Match - India won by 14 runs'
      ),
      buildMatchLink(
        `/live-cricket-scores/2/${SERIES_SLUG}/match2`,
        'England vs South Africa, 2nd Match - England beat South Africa'
      ),
      buildMatchLink(
        `/live-cricket-scores/3/${SERIES_SLUG}/match3`,
        'Pakistan vs New Zealand, 3rd Match - Match abandoned'
      ),
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(0)
    expect(result!.recent).toHaveLength(3)
    expect(result!.upcoming).toHaveLength(0)

    expect(result!.recent[0].result).toBe('India won by 14 runs')
    expect(result!.recent[1].result).toBe('England beat South Africa')
    expect(result!.recent[2].result).toBe('Match abandoned')
  })

  it('limits recent results to 3', async () => {
    const links = Array.from({ length: 6 }, (_, i) =>
      buildMatchLink(
        `/live-cricket-scores/${i}/${SERIES_SLUG}/match${i}`,
        `Team${i}A vs Team${i}B, Match ${i} - Team${i}A won by ${i + 1} runs`
      )
    )

    mockedAxios.get.mockResolvedValue({ data: buildMatchesPage(links) })

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

    mockedAxios.get.mockResolvedValue({ data: buildMatchesPage(links) })

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

    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({ data: buildMatchesPage(links) })
    )

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(5)
  })

  it('skips duplicate hrefs', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'India vs Australia, 1st Match - Live'
      ),
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'India vs Australia, 1st Match - Live'
      ),
    ])

    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({ data: html })
    )

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(1)
  })

  it('skips non-WC matches', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        '/live-cricket-scores/1/some-other-series/match1',
        'India vs Australia, Test Match - Live'
      ),
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

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

  it('skips pre-seeding placeholder matches', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/99/${SERIES_SLUG}/placeholder`,
        'X1 vs X4, Semi-Final - Tomorrow 14:00'
      ),
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'India vs Australia, 1st Match - Tomorrow 14:00'
      ),
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.upcoming).toHaveLength(1)
    expect(result!.upcoming[0].team1).toBe('India')
  })

  it('sets result text only for completed matches', async () => {
    const html = buildMatchesPage([
      buildMatchLink(
        `/live-cricket-scores/1/${SERIES_SLUG}/match1`,
        'India vs Australia, 1st Match - India won by 14 runs'
      ),
      buildMatchLink(
        `/live-cricket-scores/2/${SERIES_SLUG}/match2`,
        'England vs South Africa, 2nd Match - Live'
      ),
      buildMatchLink(
        `/live-cricket-scores/3/${SERIES_SLUG}/match3`,
        'Pakistan vs New Zealand, 3rd Match - Tomorrow 14:00'
      ),
    ])

    mockedAxios.get.mockImplementation(() =>
      Promise.resolve({ data: html })
    )

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.recent[0].result).toBe('India won by 14 runs')
    expect(result!.live[0].result).toBeUndefined()
    expect(result!.upcoming[0].result).toBeUndefined()
  })
})
