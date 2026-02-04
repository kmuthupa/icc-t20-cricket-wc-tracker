import axios from 'axios'
import * as cheerio from 'cheerio'
import { TeamStanding, Match } from './mockData'

const ESPN_BASE = 'https://www.espncricinfo.com'

export async function scrapeStandings(): Promise<TeamStanding[] | null> {
  try {
    const url = `${ESPN_BASE}/series/icc-men-s-t20-world-cup-2026-1473541/points-table-standings`
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    })
    
    const $ = cheerio.load(data)
    const standings: TeamStanding[] = []
    
    $('table tbody tr').each((index, row) => {
      const cells = $(row).find('td')
      if (cells.length >= 7) {
        standings.push({
          position: index + 1,
          team: $(cells[0]).text().trim(),
          played: parseInt($(cells[1]).text().trim()) || 0,
          won: parseInt($(cells[2]).text().trim()) || 0,
          lost: parseInt($(cells[3]).text().trim()) || 0,
          nrr: $(cells[5]).text().trim() || '0.00',
          points: parseInt($(cells[6]).text().trim()) || 0,
        })
      }
    })
    
    return standings.length > 0 ? standings : null
  } catch (error) {
    console.error('Failed to scrape standings:', error)
    return null
  }
}

export async function scrapeMatches(): Promise<{ today: Match[], upcoming: Match[] } | null> {
  try {
    const url = `${ESPN_BASE}/series/icc-men-s-t20-world-cup-2026-1473541/match-schedule-fixtures`
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    })
    
    const $ = cheerio.load(data)
    const today: Match[] = []
    const upcoming: Match[] = []
    const now = new Date()
    const todayStr = now.toDateString()
    
    $('.ds-p-4').each((index, matchCard) => {
      const teams = $(matchCard).find('.ci-team-score')
      if (teams.length >= 2) {
        const team1El = $(teams[0])
        const team2El = $(teams[1])
        
        const team1 = team1El.find('.ds-text-tight-m').text().trim()
        const team2 = team2El.find('.ds-text-tight-m').text().trim()
        const team1Score = team1El.find('.ds-text-compact-s').text().trim()
        const team2Score = team2El.find('.ds-text-compact-s').text().trim()
        
        const statusEl = $(matchCard).find('.ds-text-tight-xs')
        const statusText = statusEl.text().trim().toLowerCase()
        const venueEl = $(matchCard).find('.ds-text-tight-s')
        const venue = venueEl.first().text().trim()
        
        let status: 'completed' | 'live' | 'upcoming' = 'upcoming'
        let result = ''
        
        if (statusText.includes('won') || statusText.includes('tied')) {
          status = 'completed'
          result = statusEl.text().trim()
        } else if (statusText.includes('live') || statusText.includes('innings')) {
          status = 'live'
        }
        
        const match: Match = {
          id: `match-${index}`,
          team1: team1 || 'TBD',
          team2: team2 || 'TBD',
          team1Score: team1Score || undefined,
          team2Score: team2Score || undefined,
          result: result || undefined,
          venue: venue || 'TBD',
          time: '',
          status,
        }
        
        if (status === 'completed' || status === 'live') {
          today.push(match)
        } else {
          upcoming.push(match)
        }
      }
    })
    
    return { today: today.slice(0, 5), upcoming: upcoming.slice(0, 6) }
  } catch (error) {
    console.error('Failed to scrape matches:', error)
    return null
  }
}
