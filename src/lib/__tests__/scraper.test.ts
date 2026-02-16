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

// ─── expandTeamName ──────────────────────────────────────────────────────────

describe('expandTeamName', () => {
  it('maps known abbreviations to full names', () => {
    expect(expandTeamName('IND')).toBe('India')
    expect(expandTeamName('AUS')).toBe('Australia')
    expect(expandTeamName('ENG')).toBe('England')
    expect(expandTeamName('PAK')).toBe('Pakistan')
    expect(expandTeamName('SA')).toBe('South Africa')
    expect(expandTeamName('RSA')).toBe('South Africa')
    expect(expandTeamName('NZ')).toBe('New Zealand')
    expect(expandTeamName('WI')).toBe('West Indies')
    expect(expandTeamName('SL')).toBe('Sri Lanka')
    expect(expandTeamName('BAN')).toBe('Bangladesh')
    expect(expandTeamName('AFG')).toBe('Afghanistan')
    expect(expandTeamName('PNG')).toBe('Papua New Guinea')
    expect(expandTeamName('OMAN')).toBe('Oman')
  })

  it('returns unmapped abbreviations as-is', () => {
    expect(expandTeamName('XYZ')).toBe('XYZ')
    expect(expandTeamName('UNKNOWN')).toBe('UNKNOWN')
  })
})

// ─── parseStatus ─────────────────────────────────────────────────────────────

describe('parseStatus', () => {
  it('detects completed keywords', () => {
    expect(parseStatus('India won by 14 runs')).toBe('completed')
    expect(parseStatus('Match tied')).toBe('completed')
    expect(parseStatus('No result')).toBe('completed')
    expect(parseStatus('Match abandoned')).toBe('completed')
    expect(parseStatus('India beat Australia')).toBe('completed')
    expect(parseStatus('India defeated Pakistan')).toBe('completed')
    expect(parseStatus('Match washed out')).toBe('completed')
    expect(parseStatus('India won (DLS)')).toBe('completed')
    expect(parseStatus('Match over')).toBe('completed')
    expect(parseStatus('Awarded to India')).toBe('completed')
    expect(parseStatus('D/L method')).toBe('completed')
  })

  it('detects live keywords', () => {
    expect(parseStatus('Live')).toBe('live')
    expect(parseStatus('2nd innings')).toBe('live')
    expect(parseStatus('Innings break')).toBe('live')
    expect(parseStatus('India opt to bat')).toBe('live')
    expect(parseStatus('Australia elected to bowl')).toBe('live')
    expect(parseStatus('India batting')).toBe('live')
    expect(parseStatus('Australia bowling')).toBe('live')
    expect(parseStatus('Target: 187')).toBe('live')
    expect(parseStatus('Need 45 runs')).toBe('live')
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
      <div class="point-table-grid">Group A</div>
      <div class="point-table-grid">P W L T NR Pts NRR</div>
      <div class="point-table-grid">1IND 33006+3.050</div>
      <div class="point-table-grid">2PAK (Q)22004+1.200</div>
      <div class="point-table-grid">3USA 31202-0.500</div>
      <div class="point-table-grid">4NED 30300-1.800</div>
      <div class="point-table-grid">5NAM 30300-2.100</div>

      <div class="point-table-grid">Group B</div>
      <div class="point-table-grid">P W L T NR Pts NRR</div>
      <div class="point-table-grid">1AUS 33006+2.100</div>
      <div class="point-table-grid">2SL 32104+0.800</div>
      <div class="point-table-grid">3ZIM 31202-0.300</div>
      <div class="point-table-grid">4IRE 30300-1.200</div>
      <div class="point-table-grid">5OMAN 30300-1.500</div>

      <div class="point-table-grid">Group C</div>
      <div class="point-table-grid">P W L T NR Pts NRR</div>
      <div class="point-table-grid">1ENG (Q)33006+1.900</div>
      <div class="point-table-grid">2WI 32104+0.500</div>
      <div class="point-table-grid">3SCO 31202-0.200</div>
      <div class="point-table-grid">4NEP 30300-0.900</div>
      <div class="point-table-grid">5ITA 30300-1.400</div>

      <div class="point-table-grid">Group D</div>
      <div class="point-table-grid">P W L T NR Pts NRR</div>
      <div class="point-table-grid">1SA 33006+2.500</div>
      <div class="point-table-grid">2NZ (E)32104+0.600</div>
      <div class="point-table-grid">3AFG 31202-0.100</div>
      <div class="point-table-grid">4UAE 30300-1.000</div>
      <div class="point-table-grid">5CAN 30300-1.600</div>

      <div class="point-table-grid">SUPER 8 G1 Pre-Seeding</div>
      <div class="point-table-grid">1IND 000000.000</div>
    </body></html>
  `

  it('parses all 4 groups with correct team data', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: buildPointsTableHTML() })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(4)
    expect(result![0].group).toBe('Group A')
    expect(result![1].group).toBe('Group B')
    expect(result![2].group).toBe('Group C')
    expect(result![3].group).toBe('Group D')

    // Verify team details
    const india = result![0].teams[0]
    expect(india.team).toBe('India')
    expect(india.played).toBe(3)
    expect(india.won).toBe(3)
    expect(india.lost).toBe(0)
    expect(india.points).toBe(6)
    expect(india.nrr).toBe('+3.050')
  })

  it('handles teams with qualifier tags (Q) and (E)', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: buildPointsTableHTML() })

    const result = await scrapeStandings()
    // PAK with (Q) should still parse
    const pak = result![0].teams[1]
    expect(pak.team).toBe('Pakistan')
    expect(pak.won).toBe(2)
    // NZ with (E) should still parse
    const nz = result![3].teams[1]
    expect(nz.team).toBe('New Zealand')
    expect(nz.won).toBe(2)
  })

  it('filters out Super 8 groups', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: buildPointsTableHTML() })

    const result = await scrapeStandings()
    const groupNames = result!.map(g => g.group)
    expect(groupNames).not.toContain(expect.stringContaining('SUPER 8'))
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

    const result = await scrapeStandings()
    expect(result).toBeNull()
  })

  it('returns null on malformed HTML with no point-table-grid', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html><body><div>No tables here</div></body></html>' })

    const result = await scrapeStandings()
    expect(result).toBeNull()
  })
})

// ─── scrapeMatchScore ────────────────────────────────────────────────────────

describe('scrapeMatchScore', () => {
  beforeEach(() => jest.clearAllMocks())

  it('extracts team-attributed scores from TEAM+score pattern', async () => {
    const html = `
      <html><body>
        <div>SL97-1(10.4)</div>
        <div>AUS152-6(20)</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/aus-vs-sl')
    expect(result).toEqual([
      { team: 'SL', score: '97/1 (10.4)' },
      { team: 'AUS', score: '152/6 (20)' },
    ])
  })

  it('deduplicates identical team-score entries', async () => {
    const html = `
      <html><body>
        <div>IND186-4(20)</div>
        <div>IND186-4(20)</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/ind-vs-pak')
    expect(result).toHaveLength(1)
    expect(result![0]).toEqual({ team: 'IND', score: '186/4 (20)' })
  })

  it('returns null when no scores found', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html><body><div>No scores</div></body></html>' })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/aus-vs-sl')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'))

    const result = await scrapeMatchScore('/live-cricket-scores/12345/aus-vs-sl')
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

  it('separates today vs upcoming matches', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Australia, Match 1 - India won by 14 runs', href: '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/ind-vs-aus' },
        { title: 'England vs Pakistan, Match 2 - Starts at 14:00 IST', href: '/live-cricket-scores/2/icc-mens-t20-world-cup-2026/eng-vs-pak' },
      ]),
    })

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.today).toHaveLength(1)
    expect(result!.today[0].team1).toBe('India')
    expect(result!.today[0].status).toBe('completed')
    expect(result!.upcoming).toHaveLength(1)
    expect(result!.upcoming[0].team1).toBe('England')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('detects completed, live, and upcoming statuses', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Australia, Match 1 - India won by 14 runs', href: '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/ind-vs-aus' },
        { title: 'Sri Lanka vs England, Match 2 - Sri Lanka batting', href: '/live-cricket-scores/2/icc-mens-t20-world-cup-2026/sl-vs-eng' },
        { title: 'Pakistan vs NZ, Match 3 - Tomorrow 14:00', href: '/live-cricket-scores/3/icc-mens-t20-world-cup-2026/pak-vs-nz' },
      ]),
    })
    // Mock score fetch for live match
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html><body><div>SL97-1(10.4)</div></body></html>',
    })

    const result = await scrapeMatches()
    expect(result!.today[0].status).toBe('completed')
    expect(result!.today[1].status).toBe('live')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('respects max limits (5 today, 6 upcoming)', async () => {
    const completedLinks = Array.from({ length: 8 }, (_, i) => ({
      title: `Team${i}A vs Team${i}B, Match ${i} - Team${i}A won`,
      href: `/live-cricket-scores/${i}/icc-mens-t20-world-cup-2026/match-${i}`,
    }))
    const upcomingLinks = Array.from({ length: 10 }, (_, i) => ({
      title: `Team${i}X vs Team${i}Y, Match ${100 + i} - Tomorrow`,
      href: `/live-cricket-scores/${100 + i}/icc-mens-t20-world-cup-2026/match-${100 + i}`,
    }))

    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([...completedLinks, ...upcomingLinks]),
    })

    const result = await scrapeMatches()
    expect(result!.today.length).toBeLessThanOrEqual(5)
    expect(result!.upcoming.length).toBeLessThanOrEqual(6)
  })

  it('deduplicates by href', async () => {
    const href = '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/ind-vs-aus'
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Australia, Match 1 - India won by 14 runs', href },
        { title: 'India vs Australia, Match 1 - India won by 14 runs', href },
      ]),
    })

    const result = await scrapeMatches()
    expect(result!.today).toHaveLength(1)
  })

  it('correctly attributes live scores to the right team (bug fix)', async () => {
    // Main matches page
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'Australia vs Sri Lanka, Match 5 - Sri Lanka batting', href: '/live-cricket-scores/5/icc-mens-t20-world-cup-2026/aus-vs-sl' },
      ]),
    })
    // Score page: SL is batting at 97/1, not Australia
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html><body><div>SL97-1(10.4)</div></body></html>',
    })

    const result = await scrapeMatches()
    const liveMatch = result!.today[0]
    expect(liveMatch.team1).toBe('Australia')
    expect(liveMatch.team2).toBe('Sri Lanka')
    // SL score should be on team2, NOT team1
    expect(liveMatch.team1Score).toBeUndefined()
    expect(liveMatch.team2Score).toBe('97/1 (10.4)')
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

    const result = await scrapeMatches()
    expect(result).toBeNull()
  })
})
