import { scrapeStandings } from '../lib/scraper'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

function buildStandingsPage(rows: string[]): string {
  return `<html><body>${rows.map(r => `<div class="point-table-grid">${r}</div>`).join('\n')}</body></html>`
}

describe('scrapeStandings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parses group standings correctly', async () => {
    const html = buildStandingsPage([
      'Group A',
      '1IND 32102+1.200',
      '2PAK 31202+0.500',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Group A')
    expect(result![0].teams).toHaveLength(2)

    const india = result![0].teams[0]
    expect(india.team).toBe('India')
    expect(india.position).toBe(1)
    expect(india.played).toBe(3)
    expect(india.won).toBe(2)
    expect(india.lost).toBe(1)
    expect(india.nrr).toBe('+1.200')
    expect(india.points).toBe(2) // teamMatch[7] = "2" in "32102"
  })

  it('parses multiple groups', async () => {
    const html = buildStandingsPage([
      'Group A',
      '1IND 32102+1.200',
      'Group B',
      '1AUS 33004+2.000',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0].group).toBe('Group A')
    expect(result![1].group).toBe('Group B')
  })

  it('filters out Super 8 groups', async () => {
    const html = buildStandingsPage([
      'Group A',
      '1IND 32102+1.200',
      'SUPER 8 G1',
      '1AUS 33004+2.000',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Group A')
  })

  it('skips column header rows', async () => {
    const html = buildStandingsPage([
      'Group A',
      'PWL NRPts',
      '1IND 32102+1.200',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result![0].teams).toHaveLength(1)
  })

  it('returns null on network error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'))

    const result = await scrapeStandings()
    expect(result).toBeNull()
  })

  it('returns null for empty page', async () => {
    mockedAxios.get.mockResolvedValue({ data: '<html><body></body></html>' })

    const result = await scrapeStandings()
    expect(result).toBeNull()
  })
})
