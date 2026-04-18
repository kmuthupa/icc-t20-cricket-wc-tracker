import axios from 'axios'
import {
  expandTeamName,
  parseStatus,
  scrapeStandings,
  scrapeMatches,
  scrapeMatchScore,
} from '../scraper'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Helper: ESPN API returns empty/error so tests exercise the Cricbuzz fallback path
function mockEspnFailCricbuzz(cricbuzzResponses: { url: string, data: string }[]) {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url.includes('hs-consumer-api.espncricinfo.com')) {
      return Promise.reject(new Error('ESPN unavailable'))
    }
    for (const resp of cricbuzzResponses) {
      if (url.includes(resp.url)) {
        return Promise.resolve({ data: resp.data })
      }
    }
    return Promise.resolve({ data: '<html><body></body></html>' })
  })
}

// ─── expandTeamName ──────────────────────────────────────────────────────────

describe('expandTeamName', () => {
  it('maps known abbreviations to full names', () => {
    expect(expandTeamName('MI')).toBe('Mumbai Indians')
    expect(expandTeamName('CSK')).toBe('Chennai Super Kings')
    expect(expandTeamName('RCB')).toBe('Royal Challengers Bengaluru')
    expect(expandTeamName('KKR')).toBe('Kolkata Knight Riders')
    expect(expandTeamName('DC')).toBe('Delhi Capitals')
    expect(expandTeamName('SRH')).toBe('Sunrisers Hyderabad')
    expect(expandTeamName('RR')).toBe('Rajasthan Royals')
    expect(expandTeamName('PBKS')).toBe('Punjab Kings')
    expect(expandTeamName('LSG')).toBe('Lucknow Super Giants')
    expect(expandTeamName('GT')).toBe('Gujarat Titans')
  })

  it('returns unmapped abbreviations as-is', () => {
    expect(expandTeamName('XYZ')).toBe('XYZ')
    expect(expandTeamName('UNKNOWN')).toBe('UNKNOWN')
    expect(expandTeamName('')).toBe('')
  })
})

// ─── parseStatus ─────────────────────────────────────────────────────────────

describe('parseStatus', () => {
  it('detects completed keywords', () => {
    expect(parseStatus('Mumbai Indians won by 14 runs')).toBe('completed')
    expect(parseStatus('Match tied')).toBe('completed')
    expect(parseStatus('No result')).toBe('completed')
    expect(parseStatus('Match abandoned')).toBe('completed')
    expect(parseStatus('CSK beat MI')).toBe('completed')
    expect(parseStatus('RCB defeated KKR')).toBe('completed')
    expect(parseStatus('Match washed out')).toBe('completed')
    expect(parseStatus('MI won (DLS)')).toBe('completed')
    expect(parseStatus('Match over')).toBe('completed')
    expect(parseStatus('Awarded to MI')).toBe('completed')
    expect(parseStatus('D/L method')).toBe('completed')
  })

  it('detects live keywords', () => {
    expect(parseStatus('Live')).toBe('live')
    expect(parseStatus('2nd innings')).toBe('live')
    expect(parseStatus('Innings break')).toBe('live')
    expect(parseStatus('MI opt to bat')).toBe('live')
    expect(parseStatus('CSK elected to bowl')).toBe('live')
    expect(parseStatus('MI batting')).toBe('live')
    expect(parseStatus('CSK bowling')).toBe('live')
    expect(parseStatus('Target: 187')).toBe('live')
    expect(parseStatus('Need 45 runs')).toBe('live')
  })

  it('detects remaining completed keywords', () => {
    expect(parseStatus('Match cancelled')).toBe('completed')
    expect(parseStatus('Match washout')).toBe('completed')
    expect(parseStatus('Match forfeited')).toBe('completed')
  })

  it('is case-insensitive', () => {
    expect(parseStatus('MI WON BY 14 RUNS')).toBe('completed')
    expect(parseStatus('mi won by 14 runs')).toBe('completed')
    expect(parseStatus('LIVE')).toBe('live')
    expect(parseStatus('MI Batting')).toBe('live')
  })

  it('defaults to upcoming for unrecognized text', () => {
    expect(parseStatus('Starts at 14:00 IST')).toBe('upcoming')
    expect(parseStatus('Tomorrow')).toBe('upcoming')
    expect(parseStatus('Feb 10, 2026')).toBe('upcoming')
  })
})

// ─── scrapeStandings ─────────────────────────────────────────────────────────

describe('scrapeStandings', () => {
  beforeEach(() => jest.clearAllMocks())

  const buildPointsTableHTML = () => `
    <html><body>
      <div class="point-table-grid">Group APWLNRPtsNRR</div>
      <div class="point-table-grid">1RCB 11002+1.850</div>
      <div class="point-table-grid">2CSK 000000.000</div>
      <div class="point-table-grid">3RR 000000.000</div>
      <div class="point-table-grid">4PBKS 000000.000</div>
      <div class="point-table-grid">5KKR 000000.000</div>

      <div class="point-table-grid">Group BPWLNRPtsNRR</div>
      <div class="point-table-grid">1MI 000000.000</div>
      <div class="point-table-grid">2GT 000000.000</div>
      <div class="point-table-grid">3DC 000000.000</div>
      <div class="point-table-grid">4LSG 000000.000</div>
      <div class="point-table-grid">5SRH 10100-1.850</div>
    </body></html>
  `

  it('parses Group A and Group B in page order', async () => {
    mockEspnFailCricbuzz([{ url: 'points-table', data: buildPointsTableHTML() }])

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0].group).toBe('Group A')
    expect(result![1].group).toBe('Group B')

    const rcb = result![0].teams[0]
    expect(rcb.team).toBe('Royal Challengers Bengaluru')
    expect(rcb.played).toBe(1)
    expect(rcb.won).toBe(1)
    expect(rcb.points).toBe(2)
    expect(rcb.nrr).toBe('+1.850')

    const srh = result![1].teams[4]
    expect(srh.team).toBe('Sunrisers Hyderabad')
    expect(srh.played).toBe(1)
    expect(srh.won).toBe(0)
    expect(srh.lost).toBe(1)
    expect(srh.nrr).toBe('-1.850')
  })

  it('handles teams with qualifier tags (Q)', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Group APWLNRPtsNRR</div>
        <div class="point-table-grid">1MI (Q)44008+2.500</div>
      </body></html>
    `
    mockEspnFailCricbuzz([{ url: 'points-table', data: html }])

    const result = await scrapeStandings()
    const mi = result![0].teams[0]
    expect(mi.team).toBe('Mumbai Indians')
    expect(mi.won).toBe(4)
  })

  it('includes both Group A and Group B', async () => {
    mockEspnFailCricbuzz([{ url: 'points-table', data: buildPointsTableHTML() }])

    const result = await scrapeStandings()
    const groupNames = result!.map(g => g.group)
    expect(groupNames).toContain('Group A')
    expect(groupNames).toContain('Group B')
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'))

    const result = await scrapeStandings()
    expect(result).toBeNull()
  })

  it('returns null on malformed HTML with no point-table-grid', async () => {
    mockEspnFailCricbuzz([{ url: 'points-table', data: '<html><body><div>No tables here</div></body></html>' }])

    const result = await scrapeStandings()
    expect(result).toBeNull()
  })

  it('skips a group that has no parseable team rows', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Group APWLNRPtsNRR</div>
        <div class="point-table-grid">not a valid team row</div>
        <div class="point-table-grid">Group BPWLNRPtsNRR</div>
        <div class="point-table-grid">1KKR 33006+2.100</div>
      </body></html>
    `
    mockEspnFailCricbuzz([{ url: 'points-table', data: html }])

    const result = await scrapeStandings()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Group B')
  })

  it('parses NRR without a sign prefix (0.000)', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Group APWLNRPtsNRR</div>
        <div class="point-table-grid">1MI 000000.000</div>
      </body></html>
    `
    mockEspnFailCricbuzz([{ url: 'points-table', data: html }])

    const result = await scrapeStandings()
    expect(result![0].teams[0].nrr).toBe('0.000')
    expect(result![0].teams[0].played).toBe(0)
    expect(result![0].teams[0].points).toBe(0)
  })

  it('parses Points Table heading', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Points TablePWLNRPtsNRR</div>
        <div class="point-table-grid">1MI 11002+1.820</div>
        <div class="point-table-grid">2CSK 000000.000</div>
      </body></html>
    `
    mockEspnFailCricbuzz([{ url: 'points-table', data: html }])

    const result = await scrapeStandings()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Points Table')
    expect(result![0].teams).toHaveLength(2)
  })
})

// ─── scrapeMatchScore ────────────────────────────────────────────────────────

describe('scrapeMatchScore', () => {
  beforeEach(() => jest.clearAllMocks())

  it('extracts team-attributed scores from TEAM+score pattern', async () => {
    const html = `
      <html><body>
        <div>SRH201-9(20)</div>
        <div>RCB203-4(15.4)</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/rcb-vs-srh')
    expect(result).toEqual([
      { team: 'SRH', score: '201/9 (20)' },
      { team: 'RCB', score: '203/4 (15.4)' },
    ])
  })

  it('deduplicates identical team-score entries', async () => {
    const html = `
      <html><body>
        <div>MI186-4(20)</div>
        <div>MI186-4(20)</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/mi-vs-csk')
    expect(result).toHaveLength(1)
    expect(result![0]).toEqual({ team: 'MI', score: '186/4 (20)' })
  })

  it('handles / as score separator', async () => {
    const html = `<html><body><div>KKR152/6(20)</div></body></html>`
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/kkr-vs-rr')
    expect(result).toEqual([{ team: 'KKR', score: '152/6 (20)' }])
  })

  it('returns only one entry when just one team has batted', async () => {
    const html = `<html><body><div>MI186-4(20)</div></body></html>`
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/mi-vs-csk')
    expect(result).toHaveLength(1)
    expect(result![0]).toEqual({ team: 'MI', score: '186/4 (20)' })
  })

  it('returns null when no scores found', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html><body><div>No scores</div></body></html>' })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/mi-vs-csk')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'))

    const result = await scrapeMatchScore('/live-cricket-scores/12345/mi-vs-csk')
    expect(result).toBeNull()
  })
})

// ─── scrapeMatches ───────────────────────────────────────────────────────────

describe('scrapeMatches', () => {
  beforeEach(() => jest.clearAllMocks())

  const buildMatchesHTML = (links: { title: string, href: string }[]) => {
    const anchors = links.map(l => `<a href="${l.href}" title="${l.title}">link</a>`).join('\n')
    return `<html><body>${anchors}</body></html>`
  }

  function mockEspnFailCricbuzzMatches(cricbuzzHtml: string) {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('hs-consumer-api.espncricinfo.com')) {
        return Promise.reject(new Error('ESPN unavailable'))
      }
      if (url.includes('/matches')) {
        return Promise.resolve({ data: cricbuzzHtml })
      }
      return Promise.resolve({ data: '<html><body></body></html>' })
    })
  }

  it('separates live, recent, and upcoming matches', async () => {
    const html = buildMatchesHTML([
      { title: 'Mumbai Indians vs Chennai Super Kings, Match 1 - Mumbai Indians won by 14 runs', href: '/live-cricket-scores/1/indian-premier-league-2026/mi-vs-csk' },
      { title: 'Royal Challengers Bengaluru vs Kolkata Knight Riders, Match 2 - Starts at 14:00 IST', href: '/live-cricket-scores/2/indian-premier-league-2026/rcb-vs-kkr' },
    ])
    mockEspnFailCricbuzzMatches(html)

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('Mumbai Indians')
    expect(result!.recent[0].status).toBe('completed')
    expect(result!.upcoming).toHaveLength(1)
    expect(result!.upcoming[0].team1).toBe('Royal Challengers Bengaluru')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('detects completed, live, and upcoming statuses', async () => {
    const html = buildMatchesHTML([
      { title: 'Mumbai Indians vs Chennai Super Kings, Match 1 - Mumbai Indians won by 14 runs', href: '/live-cricket-scores/1/indian-premier-league-2026/mi-vs-csk' },
      { title: 'Sunrisers Hyderabad vs Royal Challengers Bengaluru, Match 2 - SRH batting', href: '/live-cricket-scores/2/indian-premier-league-2026/srh-vs-rcb' },
      { title: 'Delhi Capitals vs Rajasthan Royals, Match 3 - Tomorrow 14:00', href: '/live-cricket-scores/3/indian-premier-league-2026/dc-vs-rr' },
    ])

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('hs-consumer-api.espncricinfo.com')) {
        return Promise.reject(new Error('ESPN unavailable'))
      }
      if (url.includes('/matches')) {
        return Promise.resolve({ data: html })
      }
      // Score page for live match
      return Promise.resolve({ data: '<html><body><div>SRH97-1(10.4)</div></body></html>' })
    })

    const result = await scrapeMatches()
    expect(result!.recent[0].status).toBe('completed')
    expect(result!.live[0].status).toBe('live')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('respects max limits (3 recent, 5 live, 6 upcoming)', async () => {
    const completedLinks = Array.from({ length: 8 }, (_, i) => ({
      title: `Team${i}A vs Team${i}B, Match ${i} - Team${i}A won`,
      href: `/live-cricket-scores/${i}/indian-premier-league-2026/match-${i}`,
    }))
    const upcomingLinks = Array.from({ length: 10 }, (_, i) => ({
      title: `Team${i}X vs Team${i}Y, Match ${100 + i} - Tomorrow`,
      href: `/live-cricket-scores/${100 + i}/indian-premier-league-2026/match-${100 + i}`,
    }))

    mockEspnFailCricbuzzMatches(buildMatchesHTML([...completedLinks, ...upcomingLinks]))

    const result = await scrapeMatches()
    expect(result!.recent.length).toBeLessThanOrEqual(3)
    expect(result!.upcoming.length).toBeLessThanOrEqual(6)
  })

  it('deduplicates by href', async () => {
    const href = '/live-cricket-scores/1/indian-premier-league-2026/mi-vs-csk'
    mockEspnFailCricbuzzMatches(buildMatchesHTML([
      { title: 'Mumbai Indians vs Chennai Super Kings, Match 1 - MI won by 14 runs', href },
      { title: 'Mumbai Indians vs Chennai Super Kings, Match 1 - MI won by 14 runs', href },
    ]))

    const result = await scrapeMatches()
    expect(result!.recent).toHaveLength(1)
  })

  it('correctly attributes live scores to the right team', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('hs-consumer-api.espncricinfo.com')) {
        return Promise.reject(new Error('ESPN unavailable'))
      }
      if (url.includes('/matches')) {
        return Promise.resolve({
          data: buildMatchesHTML([
            { title: 'Royal Challengers Bengaluru vs Sunrisers Hyderabad, Match 5 - SRH batting', href: '/live-cricket-scores/5/indian-premier-league-2026/rcb-vs-srh' },
          ]),
        })
      }
      return Promise.resolve({ data: '<html><body><div>SRH97-1(10.4)</div></body></html>' })
    })

    const result = await scrapeMatches()
    const liveMatch = result!.live[0]
    expect(liveMatch.team1).toBe('Royal Challengers Bengaluru')
    expect(liveMatch.team2).toBe('Sunrisers Hyderabad')
    expect(liveMatch.team1Score).toBeUndefined()
    expect(liveMatch.team2Score).toBe('97/1 (10.4)')
  })

  it('filters out non-IPL series hrefs', async () => {
    mockEspnFailCricbuzzMatches(buildMatchesHTML([
      { title: 'India vs Australia, Test Match 1 - India won by 14 runs', href: '/live-cricket-scores/1/icc-test-championship/ind-vs-aus' },
      { title: 'Mumbai Indians vs Chennai Super Kings, Match 1 - MI won by 20 runs', href: '/live-cricket-scores/2/indian-premier-league-2026/mi-vs-csk' },
    ]))

    const result = await scrapeMatches()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('Mumbai Indians')
  })

  it('skips match titles that do not match expected format', async () => {
    mockEspnFailCricbuzzMatches(buildMatchesHTML([
      { title: 'No separator here at all', href: '/live-cricket-scores/1/indian-premier-league-2026/match-1' },
      { title: 'Mumbai Indians vs Chennai Super Kings, Match 2 - MI won by 14 runs', href: '/live-cricket-scores/2/indian-premier-league-2026/mi-vs-csk' },
    ]))

    const result = await scrapeMatches()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('Mumbai Indians')
  })

  it('returns empty arrays when no matches are found', async () => {
    mockEspnFailCricbuzzMatches('<html><body></body></html>')

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(0)
    expect(result!.recent).toHaveLength(0)
    expect(result!.upcoming).toHaveLength(0)
  })

  it('sets result field for completed matches and venue from matchInfo', async () => {
    mockEspnFailCricbuzzMatches(buildMatchesHTML([
      { title: 'Mumbai Indians vs Chennai Super Kings, 1st Match Group A - MI won by 14 runs', href: '/live-cricket-scores/1/indian-premier-league-2026/mi-vs-csk' },
    ]))

    const result = await scrapeMatches()
    const match = result!.recent[0]
    expect(match.result).toBe('MI won by 14 runs')
    expect(match.venue).toBe('1st Match Group A')
    expect(match.status).toBe('completed')
  })

  it('attributes both team scores to the correct teams', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('hs-consumer-api.espncricinfo.com')) {
        return Promise.reject(new Error('ESPN unavailable'))
      }
      if (url.includes('/matches')) {
        return Promise.resolve({
          data: buildMatchesHTML([
            { title: 'Mumbai Indians vs Chennai Super Kings, Match 3 - MI batting', href: '/live-cricket-scores/3/indian-premier-league-2026/mi-vs-csk' },
          ]),
        })
      }
      return Promise.resolve({ data: '<html><body><div>CSK186-4(20)</div><div>MI45-2(6.3)</div></body></html>' })
    })

    const result = await scrapeMatches()
    const match = result!.live[0]
    expect(match.team1Score).toBe('45/2 (6.3)')
    expect(match.team2Score).toBe('186/4 (20)')
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'))

    const result = await scrapeMatches()
    expect(result).toBeNull()
  })
})

// ─── ESPN Match Scraping ─────────────────────────────────────────────────────

describe('scrapeMatches - ESPN API', () => {
  beforeEach(() => jest.clearAllMocks())

  it('extracts win probability from prediction field', async () => {
    const espnData = {
      matches: [{
        series: { objectId: '1510719', slug: 'ipl-2026' },
        match: {
          objectId: '123',
          teams: [
            { team: { longName: 'Mumbai Indians', id: '1' } },
            { team: { longName: 'Chennai Super Kings', id: '2' } }
          ],
          state: 'LIVE',
          statusText: 'MI need 10 runs',
          prediction: {
            winProbability: {
              team1Percentage: 65.5,
              team2Percentage: 34.5
            }
          }
        }
      }]
    }

    mockedAxios.get.mockResolvedValueOnce({ data: espnData })

    const result = await scrapeMatches()
    expect(result!.live).toHaveLength(1)
    expect(result!.live[0].winProbability).toEqual({
      team1: 65.5,
      team2: 34.5,
      source: 'ESPNCricinfo'
    })
  })

  it('extracts win probability from homeWinPercentage/awayWinPercentage', async () => {
    const espnData = {
      matches: [{
        series: { objectId: '1510719' },
        match: {
          objectId: '124',
          teams: [
            { team: { longName: 'Gujarat Titans' } },
            { team: { longName: 'Delhi Capitals' } }
          ],
          state: 'LIVE',
          liveScene: {
            winProbability: {
              homeWinPercentage: 40,
              awayWinPercentage: 60
            }
          }
        }
      }]
    }

    mockedAxios.get.mockResolvedValueOnce({ data: espnData })

    const result = await scrapeMatches()
    expect(result!.live[0].winProbability).toEqual({
      team1: 40,
      team2: 60,
      source: 'ESPNCricinfo'
    })
  })
})
