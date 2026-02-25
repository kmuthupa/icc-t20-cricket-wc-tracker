import { expandTeamName } from '../lib/scraper'

describe('expandTeamName', () => {
  it('expands common team abbreviations', () => {
    expect(expandTeamName('IND')).toBe('India')
    expect(expandTeamName('AUS')).toBe('Australia')
    expect(expandTeamName('ENG')).toBe('England')
    expect(expandTeamName('PAK')).toBe('Pakistan')
    expect(expandTeamName('SA')).toBe('South Africa')
    expect(expandTeamName('NZ')).toBe('New Zealand')
    expect(expandTeamName('WI')).toBe('West Indies')
    expect(expandTeamName('SL')).toBe('Sri Lanka')
    expect(expandTeamName('BAN')).toBe('Bangladesh')
    expect(expandTeamName('AFG')).toBe('Afghanistan')
  })

  it('expands associate team abbreviations', () => {
    expect(expandTeamName('ZIM')).toBe('Zimbabwe')
    expect(expandTeamName('IRE')).toBe('Ireland')
    expect(expandTeamName('SCO')).toBe('Scotland')
    expect(expandTeamName('NAM')).toBe('Namibia')
    expect(expandTeamName('NED')).toBe('Netherlands')
    expect(expandTeamName('NEP')).toBe('Nepal')
    expect(expandTeamName('USA')).toBe('USA')
    expect(expandTeamName('UAE')).toBe('UAE')
    expect(expandTeamName('OMAN')).toBe('Oman')
    expect(expandTeamName('ITA')).toBe('Italy')
    expect(expandTeamName('PNG')).toBe('Papua New Guinea')
    expect(expandTeamName('CAN')).toBe('Canada')
    expect(expandTeamName('UGA')).toBe('Uganda')
  })

  it('returns abbreviation as-is for unknown teams', () => {
    expect(expandTeamName('XYZ')).toBe('XYZ')
    expect(expandTeamName('UNKNOWN')).toBe('UNKNOWN')
  })
})
