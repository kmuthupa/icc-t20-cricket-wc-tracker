import { expandTeamName } from '../lib/scraper'

describe('expandTeamName', () => {
  it('expands IPL franchise abbreviations', () => {
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

  it('returns abbreviation as-is for unknown teams', () => {
    expect(expandTeamName('XYZ')).toBe('XYZ')
    expect(expandTeamName('UNKNOWN')).toBe('UNKNOWN')
  })
})
