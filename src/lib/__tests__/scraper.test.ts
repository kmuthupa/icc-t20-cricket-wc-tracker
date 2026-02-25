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

  it('maps all remaining abbreviations', () => {
    expect(expandTeamName('ZIM')).toBe('Zimbabwe')
    expect(expandTeamName('IRE')).toBe('Ireland')
    expect(expandTeamName('SCO')).toBe('Scotland')
    expect(expandTeamName('NAM')).toBe('Namibia')
    expect(expandTeamName('NED')).toBe('Netherlands')
    expect(expandTeamName('NEP')).toBe('Nepal')
    expect(expandTeamName('USA')).toBe('USA')
    expect(expandTeamName('UAE')).toBe('UAE')
    expect(expandTeamName('ITA')).toBe('Italy')
    expect(expandTeamName('CAN')).toBe('Canada')
    expect(expandTeamName('HK')).toBe('Hong Kong')
    expect(expandTeamName('KEN')).toBe('Kenya')
    expect(expandTeamName('UGA')).toBe('Uganda')
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

  it('detects remaining completed keywords', () => {
    expect(parseStatus('Match cancelled')).toBe('completed')
    expect(parseStatus('Match washout')).toBe('completed')
    expect(parseStatus('Match forfeited')).toBe('completed')
  })

  it('is case-insensitive', () => {
    expect(parseStatus('INDIA WON BY 14 RUNS')).toBe('completed')
    expect(parseStatus('india won by 14 runs')).toBe('completed')
    expect(parseStatus('LIVE')).toBe('live')
    expect(parseStatus('India Batting')).toBe('live')
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

  // Reflects current Cricbuzz structure: Super 8 first, then completed Group Stage
  const buildPointsTableHTML = () => `
    <html><body>
      <div class="point-table-grid">Super 8 Group 1PWLNRPtsNRR</div>
      <div class="point-table-grid">1WI 11002+1.820</div>
      <div class="point-table-grid">2IND 000000.000</div>
      <div class="point-table-grid">3ZIM 000000.000</div>
      <div class="point-table-grid">4RSA 000000.000</div>

      <div class="point-table-grid">Super 8 Group 2PWLNRPtsNRR</div>
      <div class="point-table-grid">1ENG 11002+2.550</div>
      <div class="point-table-grid">2PAK 100110.000</div>
      <div class="point-table-grid">3NZ 100110.000</div>
      <div class="point-table-grid">4SL 10100-2.550</div>

      <div class="point-table-grid">Group APWLNRPtsNRR</div>
      <div class="point-table-grid">1IND (Q)33006+3.050</div>
      <div class="point-table-grid">2PAK (Q)22004+1.200</div>
      <div class="point-table-grid">3USA 31202-0.500</div>
      <div class="point-table-grid">4NED 30300-1.800</div>
      <div class="point-table-grid">5NAM 30300-2.100</div>

      <div class="point-table-grid">Group BPWLNRPtsNRR</div>
      <div class="point-table-grid">1AUS 33006+2.100</div>
      <div class="point-table-grid">2SL 32104+0.800</div>
      <div class="point-table-grid">3ZIM 31202-0.300</div>
      <div class="point-table-grid">4IRE 30300-1.200</div>
      <div class="point-table-grid">5OMAN 30300-1.500</div>

      <div class="point-table-grid">Group CPWLNRPtsNRR</div>
      <div class="point-table-grid">1ENG (Q)33006+1.900</div>
      <div class="point-table-grid">2WI 32104+0.500</div>
      <div class="point-table-grid">3SCO 31202-0.200</div>
      <div class="point-table-grid">4NEP 30300-0.900</div>
      <div class="point-table-grid">5ITA 30300-1.400</div>

      <div class="point-table-grid">Group DPWLNRPtsNRR</div>
      <div class="point-table-grid">1RSA 33006+2.500</div>
      <div class="point-table-grid">2NZ (E)32104+0.600</div>
      <div class="point-table-grid">3AFG 31202-0.100</div>
      <div class="point-table-grid">4UAE 30300-1.000</div>
      <div class="point-table-grid">5CAN 30300-1.600</div>
    </body></html>
  `

  it('parses Super 8 and Group Stage groups in page order', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: buildPointsTableHTML() })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(6)
    expect(result![0].group).toBe('Super 8 Group 1')
    expect(result![1].group).toBe('Super 8 Group 2')
    expect(result![2].group).toBe('Group A')
    expect(result![3].group).toBe('Group B')
    expect(result![4].group).toBe('Group C')
    expect(result![5].group).toBe('Group D')

    // Verify Super 8 team details
    const wi = result![0].teams[0]
    expect(wi.team).toBe('West Indies')
    expect(wi.played).toBe(1)
    expect(wi.won).toBe(1)
    expect(wi.points).toBe(2)
    expect(wi.nrr).toBe('+1.820')

    // Verify Group Stage team details
    const india = result![2].teams[0]
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
    // PAK with (Q) in Group A should still parse
    const pak = result![2].teams[1]
    expect(pak.team).toBe('Pakistan')
    expect(pak.won).toBe(2)
    // NZ with (E) in Group D should still parse
    const nz = result![5].teams[1]
    expect(nz.team).toBe('New Zealand')
    expect(nz.won).toBe(2)
  })

  it('includes Super 8 groups alongside Group Stage groups', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: buildPointsTableHTML() })

    const result = await scrapeStandings()
    const groupNames = result!.map(g => g.group)
    expect(groupNames).toContain('Super 8 Group 1')
    expect(groupNames).toContain('Super 8 Group 2')
    expect(groupNames).toContain('Group A')
    expect(groupNames).toContain('Group D')
  })

  it('ignores legacy pre-seeding format (SUPER 8 G1)', async () => {
    const legacyHTML = `
      <html><body>
        <div class="point-table-grid">Group APWLNRPtsNRR</div>
        <div class="point-table-grid">1IND 33006+3.050</div>
        <div class="point-table-grid">SUPER 8 G1 Pre-Seeding</div>
        <div class="point-table-grid">1IND 000000.000</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: legacyHTML })

    const result = await scrapeStandings()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Group A')
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

  it('skips a group that has no parseable team rows', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Group APWLNRPtsNRR</div>
        <div class="point-table-grid">not a valid team row</div>
        <div class="point-table-grid">Group BPWLNRPtsNRR</div>
        <div class="point-table-grid">1AUS 33006+2.100</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeStandings()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Group B')
  })

  it('parses NRR without a sign prefix (0.000)', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Super 8 Group 1PWLNRPtsNRR</div>
        <div class="point-table-grid">1IND 000000.000</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeStandings()
    expect(result![0].teams[0].nrr).toBe('0.000')
    expect(result![0].teams[0].played).toBe(0)
    expect(result![0].teams[0].points).toBe(0)
  })

  it('works when only Super 8 groups are present (no Group Stage)', async () => {
    const html = `
      <html><body>
        <div class="point-table-grid">Super 8 Group 1PWLNRPtsNRR</div>
        <div class="point-table-grid">1WI 11002+1.820</div>
        <div class="point-table-grid">2IND 000000.000</div>
        <div class="point-table-grid">Super 8 Group 2PWLNRPtsNRR</div>
        <div class="point-table-grid">1ENG 11002+2.550</div>
        <div class="point-table-grid">2PAK 100110.000</div>
      </body></html>
    `
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeStandings()
    expect(result).toHaveLength(2)
    expect(result![0].group).toBe('Super 8 Group 1')
    expect(result![1].group).toBe('Super 8 Group 2')
    expect(result![0].teams).toHaveLength(2)
    expect(result![1].teams).toHaveLength(2)
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

  it('handles / as score separator', async () => {
    const html = `<html><body><div>AUS152/6(20)</div></body></html>`
    mockedAxios.get.mockResolvedValueOnce({ data: html })

    const result = await scrapeMatchScore('/live-cricket-scores/12345/aus-vs-sl')
    expect(result).toEqual([{ team: 'AUS', score: '152/6 (20)' }])
  })

  it('returns only one entry when just one team has batted', async () => {
    const html = `<html><body><div>IND186-4(20)</div></body></html>`
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

  it('separates live, recent, and upcoming matches', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Australia, Match 1 - India won by 14 runs', href: '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/ind-vs-aus' },
        { title: 'England vs Pakistan, Match 2 - Starts at 14:00 IST', href: '/live-cricket-scores/2/icc-mens-t20-world-cup-2026/eng-vs-pak' },
      ]),
    })

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('India')
    expect(result!.recent[0].status).toBe('completed')
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
    expect(result!.recent[0].status).toBe('completed')
    expect(result!.live[0].status).toBe('live')
    expect(result!.upcoming[0].status).toBe('upcoming')
  })

  it('respects max limits (3 recent, 5 live, 6 upcoming)', async () => {
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
    expect(result!.recent.length).toBeLessThanOrEqual(3)
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
    expect(result!.recent).toHaveLength(1)
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
    const liveMatch = result!.live[0]
    expect(liveMatch.team1).toBe('Australia')
    expect(liveMatch.team2).toBe('Sri Lanka')
    // SL score should be on team2, NOT team1
    expect(liveMatch.team1Score).toBeUndefined()
    expect(liveMatch.team2Score).toBe('97/1 (10.4)')
  })

  it('filters out pre-seeding placeholder matches (X1 vs X4, Y2 vs Y3)', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'X1 vs X4, Super 8 Match 1 - Tomorrow', href: '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/x1-vs-x4' },
        { title: 'Y2 vs Y3, Super 8 Match 2 - Tomorrow', href: '/live-cricket-scores/2/icc-mens-t20-world-cup-2026/y2-vs-y3' },
        { title: 'India vs Pakistan, Match 3 - India won by 14 runs', href: '/live-cricket-scores/3/icc-mens-t20-world-cup-2026/ind-vs-pak' },
      ]),
    })

    const result = await scrapeMatches()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('India')
    expect(result!.upcoming).toHaveLength(0)
  })

  it('filters out non-WC series hrefs', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Australia, IPL Match 1 - India won by 14 runs', href: '/live-cricket-scores/1/ipl-2026/ind-vs-aus' },
        { title: 'England vs Pakistan, Match 1 - England won by 20 runs', href: '/live-cricket-scores/2/icc-mens-t20-world-cup-2026/eng-vs-pak' },
      ]),
    })

    const result = await scrapeMatches()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('England')
  })

  it('skips match titles that do not match expected format', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'No separator here at all', href: '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/match-1' },
        { title: 'India vs Australia, Match 2 - India won by 14 runs', href: '/live-cricket-scores/2/icc-mens-t20-world-cup-2026/ind-vs-aus' },
      ]),
    })

    const result = await scrapeMatches()
    expect(result!.recent).toHaveLength(1)
    expect(result!.recent[0].team1).toBe('India')
  })

  it('returns empty arrays when no matches are found', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<html><body></body></html>' })

    const result = await scrapeMatches()
    expect(result).not.toBeNull()
    expect(result!.live).toHaveLength(0)
    expect(result!.recent).toHaveLength(0)
    expect(result!.upcoming).toHaveLength(0)
  })

  it('strips seeding annotation from venue (X1 v X4, Y2 v Y3)', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'South Africa vs India, 43rd Match, Super 8 Group 1 (X1 v X4) - South Africa batting', href: '/live-cricket-scores/43/icc-mens-t20-world-cup-2026/sa-vs-ind' },
        { title: 'Pakistan vs New Zealand, 41st Match, Super 8 Group 2 (Y2 v Y3) - Tomorrow', href: '/live-cricket-scores/41/icc-mens-t20-world-cup-2026/pak-vs-nz' },
      ]),
    })
    mockedAxios.get.mockResolvedValueOnce({ data: '<html><body></body></html>' }) // score page

    const result = await scrapeMatches()
    expect(result!.live[0].venue).toBe('43rd Match, Super 8 Group 1')
    expect(result!.upcoming[0].venue).toBe('41st Match, Super 8 Group 2')
  })

  it('sets result field for completed matches and venue from matchInfo', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Australia, 1st Match Group A - India won by 14 runs', href: '/live-cricket-scores/1/icc-mens-t20-world-cup-2026/ind-vs-aus' },
      ]),
    })

    const result = await scrapeMatches()
    const match = result!.recent[0]
    expect(match.result).toBe('India won by 14 runs')
    expect(match.venue).toBe('1st Match Group A')
    expect(match.status).toBe('completed')
  })

  it('attributes both team scores to the correct teams', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: buildMatchesHTML([
        { title: 'India vs Pakistan, Match 3 - India batting', href: '/live-cricket-scores/3/icc-mens-t20-world-cup-2026/ind-vs-pak' },
      ]),
    })
    // Both innings completed on the score page
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html><body><div>PAK186-4(20)</div><div>IND45-2(6.3)</div></body></html>',
    })

    const result = await scrapeMatches()
    const match = result!.live[0]
    expect(match.team1Score).toBe('45/2 (6.3)')  // India is team1, batting second
    expect(match.team2Score).toBe('186/4 (20)')  // Pakistan is team2, batted first
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

    const result = await scrapeMatches()
    expect(result).toBeNull()
  })
})
