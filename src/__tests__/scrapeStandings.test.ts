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
      '1MI 32102+1.200',
      '2CSK 31202+0.500',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Group A')
    expect(result![0].teams).toHaveLength(2)

    const mi = result![0].teams[0]
    expect(mi.team).toBe('Mumbai Indians')
    expect(mi.position).toBe(1)
    expect(mi.played).toBe(3)
    expect(mi.won).toBe(2)
    expect(mi.lost).toBe(1)
    expect(mi.nrr).toBe('+1.200')
    expect(mi.points).toBe(2)
  })

  it('parses multiple groups', async () => {
    const html = buildStandingsPage([
      'Group A',
      '1MI 32102+1.200',
      'Group B',
      '1KKR 33004+2.000',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0].group).toBe('Group A')
    expect(result![1].group).toBe('Group B')
  })

  it('parses Points Table heading', async () => {
    const html = buildStandingsPage([
      'Points Table',
      '1MI 32102+1.200',
      '2KKR 33004+2.000',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0].group).toBe('Points Table')
    expect(result![0].teams).toHaveLength(2)
  })

  it('parses teams with qualifier tag like (Q)', async () => {
    const html = buildStandingsPage([
      'Group A',
      '1MI (Q)44008+2.500',
    ])

    mockedAxios.get.mockResolvedValue({ data: html })

    const result = await scrapeStandings()
    expect(result).not.toBeNull()
    expect(result![0].teams).toHaveLength(1)
    expect(result![0].teams[0].team).toBe('Mumbai Indians')
    expect(result![0].teams[0].played).toBe(4)
    expect(result![0].teams[0].won).toBe(4)
    expect(result![0].teams[0].points).toBe(8)
  })

  it('skips column header rows', async () => {
    const html = buildStandingsPage([
      'Group A',
      'PWL NRPts',
      '1MI 32102+1.200',
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
