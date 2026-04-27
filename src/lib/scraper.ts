import axios from 'axios'
import * as cheerio from 'cheerio'
import { TeamStanding, GroupStandings, Match } from './mockData'

const ESPN_API = 'https://hs-consumer-api.espncricinfo.com'
const DEFAULT_ESPN_ID = '1510719' 
const CRICBUZZ_BASE = 'https://www.cricbuzz.com'
const DEFAULT_CB_ID = '9241'
const DEFAULT_SLUG = 'indian-premier-league'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.espncricinfo.com',
  'Referer': 'https://www.espncricinfo.com/',
}

export async function scrapeStandings(seriesId: string = DEFAULT_ESPN_ID, leagueSlug: string = DEFAULT_SLUG, cricbuzzSeriesId: string = DEFAULT_CB_ID): Promise<GroupStandings[] | null> {
  const espnResult = await fetchEspnStandings(seriesId)
  if (espnResult) return espnResult
  return await fetchCricbuzzStandings(cricbuzzSeriesId, leagueSlug)
}

async function fetchEspnStandings(seriesId: string): Promise<GroupStandings[] | null> {
  try {
    const url = `${ESPN_API}/v1/pages/series/standings?lang=en&seriesId=${seriesId}`
    const { data } = await axios.get(url, { headers, timeout: 15000 })
    const standings = data?.content?.standings || data?.standings
    if (!standings) return null
    const groups: GroupStandings[] = []
    const groupsData = standings.groups || standings
    if (Array.isArray(groupsData)) {
      for (const group of groupsData) {
        const groupName = group.name || group.groupName || 'Points Table'
        const teamStats = group.teamStats || group.teams || group.standings || []
        const teams: TeamStanding[] = teamStats.map((entry: any, idx: number) => {
          const teamInfo = entry.teamInfo || entry.team || {}
          return {
            position: entry.position || entry.rank || idx + 1,
            team: teamInfo.name || teamInfo.longName || entry.teamName || 'Unknown',
            played: entry.matchesPlayed || entry.played || entry.matches || 0,
            won: entry.matchesWon || entry.won || entry.wins || 0,
            lost: entry.matchesLost || entry.lost || entry.losses || 0,
            nrr: String(entry.nrr || entry.netRunRate || '0.000'),
            points: entry.points || entry.pts || 0,
          }
        })
        if (teams.length > 0) groups.push({ group: groupName, teams })
      }
    }
    return groups.length > 0 ? groups : null
  } catch { return null }
}

async function fetchCricbuzzStandings(seriesId: string, leagueSlug: string): Promise<GroupStandings[] | null> {
  try {
    const url = `${CRICBUZZ_BASE}/cricket-series/${seriesId}/${leagueSlug}-2026/points-table`
    const { data } = await axios.get(url, { headers, timeout: 15000 })
    const $ = cheerio.load(data), groups: GroupStandings[] = []
    let currentGroupName = 'Points Table', currentTeams: TeamStanding[] = []
    $('.point-table-grid').each((_, row) => {
      const text = $(row).text().trim().replace(/\s+/g, ' ')
      const groupMatch = text.match(/^(Group [A-Z]|Points Table)/)
      if (groupMatch) {
        if (currentTeams.length > 0) groups.push({ group: currentGroupName, teams: currentTeams })
        currentGroupName = groupMatch[1]; currentTeams = []; return
      }
      if (text.includes('PWL') || text.includes('NRPts')) return
      const teamMatch = text.match(/^(\d+)([A-Z]+)\s+(?:\([A-Z]\))?(\d)(\d)(\d)(\d)(\d)([-+]?\d+\.\d+)$/)
      if (teamMatch) {
        currentTeams.push({
          position: parseInt(teamMatch[1]), team: expandTeamName(teamMatch[2]),
          played: parseInt(teamMatch[3]), won: parseInt(teamMatch[4]),
          lost: parseInt(teamMatch[5]), nrr: teamMatch[8], points: parseInt(teamMatch[7]),
        })
      }
    })
    if (currentTeams.length > 0) groups.push({ group: currentGroupName, teams: currentTeams })
    return groups.length > 0 ? groups : null
  } catch { return null }
}

export async function scrapeMatches(seriesId: string = DEFAULT_ESPN_ID, leagueSlug: string = DEFAULT_SLUG, cricbuzzSeriesId: string = DEFAULT_CB_ID): Promise<{ live: Match[], recent: Match[], upcoming: Match[] } | null> {
  const espnResult = await fetchEspnMatches(seriesId, leagueSlug)
  if (espnResult) return espnResult
  return await fetchCricbuzzMatches(cricbuzzSeriesId, leagueSlug)
}

async function fetchEspnMatches(seriesId: string, leagueSlug: string): Promise<{ live: Match[], recent: Match[], upcoming: Match[] } | null> {
  try {
    const { data } = await axios.get(`${ESPN_API}/v1/pages/matches/current?lang=en&latest=true`, { headers, timeout: 15000 })
    const live: Match[] = [], recent: Match[] = [], upcoming: Match[] = []
    const allMatches = data?.matches || data?.content?.matches || []
    const seriesMatches = allMatches.filter((m: any) => {
      const s = m.series || {}; const sId = String(s.objectId || s.id || ''); const sSlug = String(s.slug || '').toLowerCase()
      return sId === seriesId || sSlug.includes(leagueSlug.toLowerCase()) || (leagueSlug === 'indian-premier-league' && sSlug.includes('ipl'))
    })
    if (seriesMatches.length === 0) return null
    for (const m of seriesMatches) {
      const match = m.match || m; const teams = match.teams || []
      if (teams.length < 2) continue
      const t1 = teams[0].team || teams[0]; const t2 = teams[1].team || teams[1]
      const state = String(match.state || m.state || '').toUpperCase()
      const stage = String(match.stage || m.stage || '').toUpperCase()
      const statusText = match.statusText || ''
      let status: 'completed' | 'live' | 'upcoming'
      if (state === 'LIVE' || stage === 'RUNNING') status = 'live'
      else if (state === 'POST' || state === 'FINISHED' || state === 'COMPLETE' || stage === 'FINISHED') status = 'completed'
      else if (state === 'PRE' || state === 'UPCOMING' || stage === 'SCHEDULED') status = 'upcoming'
      else status = parseStatus(statusText)
      const matchObj: Match = {
        id: `espn-${match.objectId || match.id}`, team1: t1.longName || t1.name, team2: t2.longName || t2.name,
        venue: match.ground?.name || match.title || 'Unknown', time: match.startTime || '', status,
        result: status === 'completed' ? statusText : undefined,
      }
      const prob = match.prediction?.winProbability || match.liveScene?.winProbability
      if (prob) matchObj.winProbability = { team1: prob.team1Percentage || prob.homeWinPercentage, team2: prob.team2Percentage || prob.awayWinPercentage, source: 'ESPNCricinfo' }
      if (status === 'live' && live.length < 5) live.push(matchObj)
      else if (status === 'completed' && recent.length < 3) recent.push(matchObj)
      else if (status === 'upcoming' && upcoming.length < 6) upcoming.push(matchObj)
    }
    return { live, recent, upcoming }
  } catch { return null }
}

async function fetchCricbuzzMatches(seriesId: string, leagueSlug: string): Promise<{ live: Match[], recent: Match[], upcoming: Match[] } | null> {
  try {
    const { data } = await axios.get(`${CRICBUZZ_BASE}/cricket-series/${seriesId}/${leagueSlug}-2026/matches`, { headers, timeout: 15000 })
    const $ = cheerio.load(data), live: Match[] = [], recent: Match[] = [], upcoming: Match[] = [], seen = new Set<string>()
    const urls: { m: Match, h: string }[] = []
    $('a[href*="/live-cricket-scores/"]').each((i, el) => {
      const h = $(el).attr('href') || '', t = $(el).attr('title') || '', id = h.split('/')[2]
      if (seen.has(id) || (!h.includes(leagueSlug) && !t.toLowerCase().includes('premier league'))) return
      seen.add(id); const tm = t.match(/^(.+?)\s+vs\s+(.+?),\s*(.+?)\s*-\s*(.+)$/)
      if (!tm) return
      const s = parseStatus(tm[4]), m: Match = { id: `cb-${id}`, team1: tm[1].trim(), team2: tm[2].trim(), venue: tm[3].trim(), time: '', status: s, result: s === 'completed' ? tm[4].trim() : undefined }
      if (s === 'live' && live.length < 5) { live.push(m); urls.push({ m, h }) }
      else if (s === 'completed' && recent.length < 3) recent.push(m)
      else if (s === 'upcoming' && upcoming.length < 6) upcoming.push(m)
    })
    await Promise.all(urls.map(async ({ m, h }) => {
      const scores = await scrapeMatchScore(h)
      if (scores) scores.forEach(s => { const ex = expandTeamName(s.team); if (ex === m.team1 || s.team === m.team1) m.team1Score = s.score; else if (ex === m.team2 || s.team === m.team2) m.team2Score = s.score })
    }))
    return { live, recent, upcoming }
  } catch { return null }
}

export async function scrapeMatchScore(h: string): Promise<{ team: string, score: string }[] | null> {
  try {
    const { data } = await axios.get(`${CRICBUZZ_BASE}${h}`, { headers, timeout: 10000 })
    const $ = cheerio.load(data), s: { team: string, score: string }[] = [], seen = new Set<string>()
    $('div').each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, ''), m = t.match(/^([A-Z]{2,4})(\d+)[-/](\d+)\((\d+\.?\d*)\)/)
      if (m) { const e = { team: m[1], score: `${m[2]}/${m[3]} (${m[4]})` }, k = `${e.team}-${e.score}`; if (!seen.has(k)) { seen.add(k); s.push(e) } }
    })
    return s.length > 0 ? s : null
  } catch { return null }
}

export function parseStatus(t: string): 'completed' | 'live' | 'upcoming' {
  const l = t.toLowerCase()
  if (l.includes('toss') || l.includes('opt to') || l.includes('elected to') || l.includes('chose to')) return 'live'
  if (l.includes('won') || l.includes('tied') || l.includes('complete') || l.includes('drawn') || l.includes('no result') || l.includes('abandoned') || l.includes('beat') || l.includes('defeated') || l.includes('washed out') || l.includes('washout') || l.includes('forfeit') || l.includes('awarded') || l.includes('dls') || l.includes('d/l') || /\bmatch over\b/.test(l) || l.includes('cancelled')) return 'completed'
  if (l.includes('live') || l.includes('innings') || l.includes('break') || l.includes('batting') || l.includes('bowling') || l.includes('target') || l.includes('need') || /\d+[/-]\d+\s*\(/.test(l)) return 'live'
  return 'upcoming'
}

export function expandTeamName(a: string): string {
  const t: Record<string, string> = { 'MI': 'Mumbai Indians', 'CSK': 'Chennai Super Kings', 'RCB': 'Royal Challengers Bengaluru', 'KKR': 'Kolkata Knight Riders', 'DC': 'Delhi Capitals', 'SRH': 'Sunrisers Hyderabad', 'RR': 'Rajasthan Royals', 'PBKS': 'Punjab Kings', 'LSG': 'Lucknow Super Giants', 'GT': 'Gujarat Titans' }
  return t[a] || a
}
