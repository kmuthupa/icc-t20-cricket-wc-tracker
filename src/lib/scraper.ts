import axios from 'axios'
import * as cheerio from 'cheerio'
import { TeamStanding, GroupStandings, Match } from './mockData'

const CRICBUZZ_BASE = 'https://www.cricbuzz.com'
const SERIES_ID = '11253'
const SERIES_SLUG = 'icc-mens-t20-world-cup-2026'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

export async function scrapeStandings(): Promise<GroupStandings[] | null> {
  try {
    const url = `${CRICBUZZ_BASE}/cricket-series/${SERIES_ID}/${SERIES_SLUG}/points-table`
    const { data } = await axios.get(url, { headers, timeout: 15000 })
    
    const $ = cheerio.load(data)
    const groups: GroupStandings[] = []
    let currentGroupName = ''
    let currentTeams: TeamStanding[] = []
    
    $('.point-table-grid').each((_, row) => {
      const text = $(row).text().trim().replace(/\s+/g, ' ')
      
      // Check for group header
      const groupMatch = text.match(/^(Group [A-D]|SUPER 8 G\d)/)
      if (groupMatch) {
        if (currentGroupName && currentTeams.length > 0) {
          groups.push({ group: currentGroupName, teams: currentTeams })
        }
        currentGroupName = groupMatch[1]
        currentTeams = []
        return
      }
      
      // Skip column headers
      if (text.includes('PWL') || text.includes('NRPts') || text.includes('Pre-Seeding')) {
        return
      }
      
      // Parse team row: "1IND 000000.000" or "1PAK 11002+0.240" or "1IND (Q)33006+3.050"
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
    
    // Push the last group
    if (currentGroupName && currentTeams.length > 0) {
      groups.push({ group: currentGroupName, teams: currentTeams })
    }
    
    // Only return Group A-D for now (skip Super 8 pre-seeding)
    const mainGroups = groups.filter(g => g.group.startsWith('Group'))
    
    return mainGroups.length > 0 ? mainGroups : null
  } catch (error) {
    console.error('Failed to scrape standings:', error)
    return null
  }
}

export async function scrapeMatches(): Promise<{ today: Match[], upcoming: Match[] } | null> {
  try {
    const url = `${CRICBUZZ_BASE}/cricket-series/${SERIES_ID}/${SERIES_SLUG}/matches`
    const { data } = await axios.get(url, { headers, timeout: 15000 })
    
    const $ = cheerio.load(data)
    const today: Match[] = []
    const upcoming: Match[] = []
    const seenHrefs = new Set<string>()
    const liveMatchUrls: { match: Match, href: string }[] = []
    
    $('a[href*="/live-cricket-scores/"]').each((index, el) => {
      const title = $(el).attr('title') || ''
      const href = $(el).attr('href') || ''
      
      // Skip duplicates
      if (seenHrefs.has(href)) return
      seenHrefs.add(href)
      
      // Only include T20 WC matches
      if (!href.includes(SERIES_SLUG) && !title.toLowerCase().includes('t20 world cup 2026')) {
        return
      }
      
      // Parse title: "Team1 vs Team2, Match Info - Status"
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
      
      if (status === 'completed' || status === 'live') {
        if (today.length < 5) {
          today.push(match)
          if (status === 'live') {
            liveMatchUrls.push({ match, href })
          }
        }
      } else {
        if (upcoming.length < 6) upcoming.push(match)
      }
    })
    
    // Fetch scores for live matches
    await Promise.all(liveMatchUrls.map(async ({ match, href }) => {
      try {
        const scores = await scrapeMatchScore(href)
        if (scores) {
          match.team1Score = scores.team1Score
          match.team2Score = scores.team2Score
        }
      } catch (e) {
        console.error('Failed to fetch score for', href, e)
      }
    }))
    
    return { today, upcoming }
  } catch (error) {
    console.error('Failed to scrape matches:', error)
    return null
  }
}

async function scrapeMatchScore(href: string): Promise<{ team1Score?: string, team2Score?: string } | null> {
  try {
    const url = `${CRICBUZZ_BASE}${href}`
    const { data } = await axios.get(url, { headers, timeout: 10000 })
    const $ = cheerio.load(data)
    
    const scores: { team1Score?: string, team2Score?: string } = {}
    
    // Find score pattern like "IND118-7(16.4)" or "USA 45-2 (6.3)"
    $('div').each((i, el) => {
      const text = $(el).clone().children().remove().end().text().trim()
      // Match patterns like "118-7(16.4)" or "45/2 (6.3)"
      const scoreMatch = text.match(/^(\d+)[-/](\d+)\s*\((\d+\.?\d*)\)$/)
      if (scoreMatch && !scores.team1Score) {
        scores.team1Score = `${scoreMatch[1]}/${scoreMatch[2]} (${scoreMatch[3]})`
      }
    })
    
    // Also try to find full team score text
    $('div').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, '')
      // Match "IND118-7(16.4)" pattern
      const fullMatch = text.match(/^([A-Z]{2,4})(\d+)[-/](\d+)\((\d+\.?\d*)\)/)
      if (fullMatch) {
        const score = `${fullMatch[2]}/${fullMatch[3]} (${fullMatch[4]})`
        if (!scores.team1Score) {
          scores.team1Score = score
        } else if (!scores.team2Score && score !== scores.team1Score) {
          scores.team2Score = score
        }
      }
    })
    
    return scores.team1Score ? scores : null
  } catch (error) {
    console.error('Failed to scrape match score:', error)
    return null
  }
}

function parseStatus(text: string): 'completed' | 'live' | 'upcoming' {
  const lower = text.toLowerCase()
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
      lower.includes('bowling') || lower.includes('target') || lower.includes('need')) {
    return 'live'
  }
  return 'upcoming'
}

function expandTeamName(abbr: string): string {
  const teams: Record<string, string> = {
    'IND': 'India',
    'AUS': 'Australia',
    'ENG': 'England',
    'PAK': 'Pakistan',
    'SA': 'South Africa',
    'RSA': 'South Africa',
    'NZ': 'New Zealand',
    'WI': 'West Indies',
    'SL': 'Sri Lanka',
    'BAN': 'Bangladesh',
    'AFG': 'Afghanistan',
    'ZIM': 'Zimbabwe',
    'IRE': 'Ireland',
    'SCO': 'Scotland',
    'NAM': 'Namibia',
    'NED': 'Netherlands',
    'NEP': 'Nepal',
    'USA': 'USA',
    'UAE': 'UAE',
    'OMAN': 'Oman',
    'ITA': 'Italy',
    'PNG': 'Papua New Guinea',
    'CAN': 'Canada',
    'HK': 'Hong Kong',
    'KEN': 'Kenya',
    'UGA': 'Uganda',
  }
  return teams[abbr] || abbr
}
