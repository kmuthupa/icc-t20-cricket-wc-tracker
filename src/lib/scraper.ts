import axios from 'axios'
import * as cheerio from 'cheerio'
import { TeamStanding, GroupStandings, Match } from './mockData'

// ESPNCricinfo API (primary — no Cloudflare)
const ESPN_API = 'https://hs-consumer-api.espncricinfo.com'
const ESPN_SERIES_ID = '1510719' // IPL 2026 on ESPNCricinfo

// Cricbuzz (fallback — may be blocked by Cloudflare)
const CRICBUZZ_BASE = 'https://www.cricbuzz.com'
const CRICBUZZ_SERIES_ID = '9241'
const CRICBUZZ_SERIES_SLUG = 'indian-premier-league-2026'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// ─── Standings ──────────────────────────────────────────────────────────────

export async function scrapeStandings(): Promise<GroupStandings[] | null> {
  // Try ESPN API first, then Cricbuzz fallback
  const espnResult = await fetchEspnStandings()
  if (espnResult) return espnResult

  const cricbuzzResult = await fetchCricbuzzStandings()
  if (cricbuzzResult) return cricbuzzResult

  return null
}

async function fetchEspnStandings(): Promise<GroupStandings[] | null> {
  try {
    const url = `${ESPN_API}/v1/pages/series/standings?lang=en&seriesId=${ESPN_SERIES_ID}`
    const { data } = await axios.get(url, { headers, timeout: 15000 })

    // ESPNCricinfo standings response has standings data nested in content
    const standings = data?.content?.standings || data?.standings
    if (!standings) return null

    // Handle grouped format (Group A, Group B)
    const groups: GroupStandings[] = []

    // The API may return groups array or a flat list
    const groupsData = standings.groups || standings
    if (Array.isArray(groupsData)) {
      for (const group of groupsData) {
        const groupName = group.name || group.groupName || 'Points Table'
        const teamStats = group.teamStats || group.teams || group.standings || []

        const teams: TeamStanding[] = teamStats.map((entry: Record<string, unknown>, idx: number) => {
          // Handle nested team info or flat structure
          const teamInfo = (entry.teamInfo || entry.team || {}) as Record<string, unknown>
          const teamName = (teamInfo.name || teamInfo.longName || entry.teamName || 'Unknown') as string

          return {
            position: ((entry.position || entry.rank || idx + 1) as number),
            team: teamName,
            played: ((entry.matchesPlayed || entry.played || entry.matches || 0) as number),
            won: ((entry.matchesWon || entry.won || entry.wins || 0) as number),
            lost: ((entry.matchesLost || entry.lost || entry.losses || 0) as number),
            nrr: String(entry.nrr || entry.netRunRate || '0.000'),
            points: ((entry.points || entry.pts || 0) as number),
          }
        })

        if (teams.length > 0) {
          groups.push({ group: groupName, teams })
        }
      }
    }

    return groups.length > 0 ? groups : null
  } catch (error) {
    console.error('ESPN standings failed:', error instanceof Error ? error.message : error)
    return null
  }
}

async function fetchCricbuzzStandings(): Promise<GroupStandings[] | null> {
  try {
    const url = `${CRICBUZZ_BASE}/cricket-series/${CRICBUZZ_SERIES_ID}/${CRICBUZZ_SERIES_SLUG}/points-table`
    const { data } = await axios.get(url, { headers, timeout: 15000 })

    const $ = cheerio.load(data)
    const groups: GroupStandings[] = []
    let currentGroupName = 'Points Table'
    let currentTeams: TeamStanding[] = []

    $('.point-table-grid').each((_, row) => {
      const text = $(row).text().trim().replace(/\s+/g, ' ')

      const groupMatch = text.match(/^(Group [A-Z]|Points Table)/)
      if (groupMatch) {
        if (currentTeams.length > 0) {
          groups.push({ group: currentGroupName, teams: currentTeams })
        }
        currentGroupName = groupMatch[1]
        currentTeams = []
        return
      }

      if (text.includes('PWL') || text.includes('NRPts')) return

      const teamMatch = text.match(/^(\d+)([A-Z]+)\s+(?:\([A-Z]\))?(\d)(\d)(\d)(\d)(\d)([-+]?\d+\.\d+)$/)
      if (teamMatch && currentGroupName) {
        currentTeams.push({
          position: parseInt(teamMatch[1]),
          team: expandTeamName(teamMatch[2]),
          played: parseInt(teamMatch[3]) || 0,
          won: parseInt(teamMatch[4]) || 0,
          lost: parseInt(teamMatch[5]) || 0,
          nrr: teamMatch[8],
          points: parseInt(teamMatch[7]) || 0,
        })
      }
    })

    if (currentTeams.length > 0) {
      groups.push({ group: currentGroupName, teams: currentTeams })
    }

    const mainGroups = groups.filter(g => g.group.startsWith('Group') || g.group === 'Points Table')
    return mainGroups.length > 0 ? mainGroups : null
  } catch (error) {
    console.error('Cricbuzz standings failed:', error instanceof Error ? error.message : error)
    return null
  }
}

// ─── Matches ────────────────────────────────────────────────────────────────

export async function scrapeMatches(): Promise<{ live: Match[], recent: Match[], upcoming: Match[] } | null> {
  // Try ESPN API first, then Cricbuzz fallback
  const espnResult = await fetchEspnMatches()
  if (espnResult) return espnResult

  const cricbuzzResult = await fetchCricbuzzMatches()
  if (cricbuzzResult) return cricbuzzResult

  return null
}

async function fetchEspnMatches(): Promise<{ live: Match[], recent: Match[], upcoming: Match[] } | null> {
  try {
    const url = `${ESPN_API}/v1/pages/matches/current?lang=en&latest=true`
    const { data } = await axios.get(url, { headers, timeout: 15000 })

    const live: Match[] = []
    const recent: Match[] = []
    const upcoming: Match[] = []

    // The response contains matches array at top level or under content
    const allMatches = data?.matches || data?.content?.matches || []
    if (!Array.isArray(allMatches) || allMatches.length === 0) return null

    // Filter to IPL matches only
    const iplMatches = allMatches.filter((m: Record<string, unknown>) => {
      const series = m.series as Record<string, unknown> | undefined
      const seriesId = String(series?.objectId || series?.id || '')
      const seriesSlug = String(series?.slug || '')
      return seriesId === ESPN_SERIES_ID ||
        seriesSlug.includes('indian-premier-league') ||
        seriesSlug.includes('ipl')
    })

    if (iplMatches.length === 0) return null

    for (const m of iplMatches) {
      const match = (m.match || m) as Record<string, unknown>
      const teams = (match.teams || []) as Record<string, unknown>[]
      if (teams.length < 2) continue

      const team1Info = (teams[0]?.team || teams[0]) as Record<string, unknown>
      const team2Info = (teams[1]?.team || teams[1]) as Record<string, unknown>
      const team1Name = String(team1Info?.longName || team1Info?.name || 'TBA')
      const team2Name = String(team2Info?.longName || team2Info?.name || 'TBA')

      const state = String(match.state || m.state || '').toUpperCase()
      const stage = String(match.stage || m.stage || '').toUpperCase()
      const statusText = String(match.statusText || m.statusText || '')
      const matchTitle = String(match.title || m.title || '')
      const groundInfo = (match.ground || m.ground || {}) as Record<string, unknown>
      const townInfo = (groundInfo.town || groundInfo.city || {}) as Record<string, unknown>
      const venue = groundInfo.name
        ? `${groundInfo.name}${townInfo.name ? `, ${townInfo.name}` : ''}`
        : matchTitle

      const startTime = String(match.startTime || m.startTime || '')
      const formattedTime = startTime ? formatMatchTime(startTime) : ''

      // Determine status from ESPN state field
      let status: 'completed' | 'live' | 'upcoming'
      if (state === 'LIVE' || stage === 'RUNNING') {
        status = 'live'
      } else if (state === 'POST' || state === 'FINISHED' || state === 'COMPLETE' || stage === 'FINISHED') {
        status = 'completed'
      } else if (state === 'PRE' || state === 'UPCOMING' || stage === 'SCHEDULED') {
        status = 'upcoming'
      } else {
        status = parseStatus(statusText)
      }

      const matchObj: Match = {
        id: `espn-${String(match.objectId || match.id || Math.random())}`,
        team1: team1Name,
        team2: team2Name,
        venue: String(venue),
        time: formattedTime,
        status,
        result: status === 'completed' ? statusText : undefined,
      }

      // Extract scores from innings data if available
      const innings = (m.innings || match.innings || (m as Record<string, unknown>).scorecard || []) as Record<string, unknown>[]
      if (Array.isArray(innings)) {
        for (const inn of innings) {
          const innTeam = (inn.team || {}) as Record<string, unknown>
          const innTeamName = String(innTeam.longName || innTeam.name || '')
          const runs = inn.runs ?? inn.score
          const wickets = inn.wickets
          const overs = inn.overs
          if (runs !== undefined) {
            const scoreStr = `${runs}/${wickets ?? '?'} (${overs ?? '?'})`
            if (innTeamName === team1Name || String(innTeam.id) === String(team1Info.id)) {
              matchObj.team1Score = scoreStr
            } else if (innTeamName === team2Name || String(innTeam.id) === String(team2Info.id)) {
              matchObj.team2Score = scoreStr
            }
          }
        }
      }

      if (status === 'live' && live.length < 5) {
        live.push(matchObj)
      } else if (status === 'completed' && recent.length < 3) {
        recent.push(matchObj)
      } else if (status === 'upcoming' && upcoming.length < 6) {
        upcoming.push(matchObj)
      }
    }

    // Only consider it a success if we found at least one match
    const total = live.length + recent.length + upcoming.length
    return total > 0 ? { live, recent, upcoming } : null
  } catch (error) {
    console.error('ESPN matches failed:', error instanceof Error ? error.message : error)
    return null
  }
}

function formatMatchTime(isoTime: string): string {
  try {
    const date = new Date(isoTime)
    return date.toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }) + ' IST'
  } catch {
    return isoTime
  }
}

async function fetchCricbuzzMatches(): Promise<{ live: Match[], recent: Match[], upcoming: Match[] } | null> {
  try {
    const url = `${CRICBUZZ_BASE}/cricket-series/${CRICBUZZ_SERIES_ID}/${CRICBUZZ_SERIES_SLUG}/matches`
    const { data } = await axios.get(url, { headers, timeout: 15000 })

    const $ = cheerio.load(data)
    const live: Match[] = []
    const recent: Match[] = []
    const upcoming: Match[] = []
    const seenMatchIds = new Set<string>()
    const liveMatchUrls: { match: Match, href: string }[] = []

    $('a[href*="/live-cricket-scores/"]').each((index, el) => {
      const title = $(el).attr('title') || ''
      const href = $(el).attr('href') || ''

      // Deduplicate by match ID (numeric segment after /live-cricket-scores/)
      const matchIdMatch = href.match(/\/live-cricket-scores\/(\d+)\//)
      const matchId = matchIdMatch ? matchIdMatch[1] : href
      if (seenMatchIds.has(matchId)) return
      seenMatchIds.add(matchId)

      if (!href.includes(CRICBUZZ_SERIES_SLUG) && !href.includes('ipl-2026') && !title.toLowerCase().includes('indian premier league')) {
        return
      }

      const titleMatch = title.match(/^(.+?)\s+vs\s+(.+?),\s*(.+?)\s*-\s*(.+)$/)
      if (!titleMatch) return

      const [, team1, team2, matchInfo, statusText] = titleMatch
      const status = parseStatus(statusText.trim())

      const match: Match = {
        id: `match-${index}`,
        team1: team1.trim(),
        team2: team2.trim(),
        venue: matchInfo.trim(),
        time: '',
        status,
        result: status === 'completed' ? statusText.trim() : undefined,
      }

      if (status === 'live') {
        if (live.length < 5) {
          live.push(match)
          liveMatchUrls.push({ match, href })
        }
      } else if (status === 'completed') {
        if (recent.length < 3) recent.push(match)
      } else {
        if (upcoming.length < 6) upcoming.push(match)
      }
    })

    await Promise.all(liveMatchUrls.map(async ({ match, href }) => {
      try {
        const scores = await scrapeMatchScore(href)
        if (scores) {
          for (const { team, score } of scores) {
            const expanded = expandTeamName(team)
            if (expanded === match.team1 || team === match.team1) {
              match.team1Score = score
            } else if (expanded === match.team2 || team === match.team2) {
              match.team2Score = score
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch score for', href, e)
      }
    }))

    return { live, recent, upcoming }
  } catch (error) {
    console.error('Cricbuzz matches failed:', error instanceof Error ? error.message : error)
    return null
  }
}

// ─── Score scraping (Cricbuzz fallback) ─────────────────────────────────────

export async function scrapeMatchScore(href: string): Promise<{ team: string, score: string }[] | null> {
  try {
    const url = `${CRICBUZZ_BASE}${href}`
    const { data } = await axios.get(url, { headers, timeout: 10000 })
    const $ = cheerio.load(data)

    const scores: { team: string, score: string }[] = []
    const seen = new Set<string>()

    $('div').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, '')
      const fullMatch = text.match(/^([A-Z]{2,4})(\d+)[-/](\d+)\((\d+\.?\d*)\)/)
      if (fullMatch) {
        const team = fullMatch[1]
        const score = `${fullMatch[2]}/${fullMatch[3]} (${fullMatch[4]})`
        const key = `${team}-${score}`
        if (!seen.has(key)) {
          seen.add(key)
          scores.push({ team, score })
        }
      }
    })

    return scores.length > 0 ? scores : null
  } catch (error) {
    console.error('Failed to scrape match score:', error instanceof Error ? error.message : error)
    return null
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function parseStatus(text: string): 'completed' | 'live' | 'upcoming' {
  const lower = text.toLowerCase()

  if (lower.includes('toss')) return 'live'

  if (lower.includes('won') || lower.includes('tied') || lower.includes('complete') ||
      lower.includes('drawn') || lower.includes('no result') || lower.includes('abandoned') ||
      lower.includes('cancelled') || lower.includes('beat') || lower.includes('defeated') ||
      lower.includes('washed out') || lower.includes('washout') || lower.includes('forfeit') ||
      lower.includes('awarded') || lower.includes('dls') || lower.includes('d/l') ||
      /\bmatch over\b/.test(lower)) {
    return 'completed'
  }
  if (lower.includes('live') || lower.includes('innings') || lower.includes('break') ||
      lower.includes('opt to') || lower.includes('elected to') || lower.includes('batting') ||
      lower.includes('bowling') || lower.includes('target') || lower.includes('need') ||
      lower.includes('chose to') ||
      /\d+[/-]\d+\s*\(/.test(lower)) {
    return 'live'
  }
  return 'upcoming'
}

export function expandTeamName(abbr: string): string {
  const teams: Record<string, string> = {
    'MI': 'Mumbai Indians',
    'CSK': 'Chennai Super Kings',
    'RCB': 'Royal Challengers Bengaluru',
    'KKR': 'Kolkata Knight Riders',
    'DC': 'Delhi Capitals',
    'SRH': 'Sunrisers Hyderabad',
    'RR': 'Rajasthan Royals',
    'PBKS': 'Punjab Kings',
    'LSG': 'Lucknow Super Giants',
    'GT': 'Gujarat Titans',
  }
  return teams[abbr] || abbr
}
