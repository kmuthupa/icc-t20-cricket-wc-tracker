import {
  mockStandings,
  mockLiveMatches,
  mockRecentResults,
  mockUpcomingMatches,
} from '../lib/mockData'

describe('mockData', () => {
  describe('mockStandings', () => {
    it('has 4 groups (A-D)', () => {
      expect(mockStandings).toHaveLength(4)
      expect(mockStandings.map(g => g.group)).toEqual([
        'Group A', 'Group B', 'Group C', 'Group D',
      ])
    })

    it('each group has 5 teams', () => {
      mockStandings.forEach(group => {
        expect(group.teams).toHaveLength(5)
      })
    })

    it('teams have required fields', () => {
      mockStandings.forEach(group => {
        group.teams.forEach(team => {
          expect(team).toHaveProperty('position')
          expect(team).toHaveProperty('team')
          expect(team).toHaveProperty('played')
          expect(team).toHaveProperty('won')
          expect(team).toHaveProperty('lost')
          expect(team).toHaveProperty('nrr')
          expect(team).toHaveProperty('points')
        })
      })
    })
  })

  describe('mockLiveMatches', () => {
    it('all have status "live"', () => {
      mockLiveMatches.forEach(match => {
        expect(match.status).toBe('live')
      })
    })

    it('have required match fields', () => {
      mockLiveMatches.forEach(match => {
        expect(match.id).toBeDefined()
        expect(match.team1).toBeDefined()
        expect(match.team2).toBeDefined()
        expect(match.venue).toBeDefined()
      })
    })
  })

  describe('mockRecentResults', () => {
    it('all have status "completed"', () => {
      mockRecentResults.forEach(match => {
        expect(match.status).toBe('completed')
      })
    })

    it('all have a result string', () => {
      mockRecentResults.forEach(match => {
        expect(match.result).toBeDefined()
        expect(typeof match.result).toBe('string')
      })
    })
  })

  describe('mockUpcomingMatches', () => {
    it('all have status "upcoming"', () => {
      mockUpcomingMatches.forEach(match => {
        expect(match.status).toBe('upcoming')
      })
    })

    it('none have result or scores', () => {
      mockUpcomingMatches.forEach(match => {
        expect(match.result).toBeUndefined()
        expect(match.team1Score).toBeUndefined()
        expect(match.team2Score).toBeUndefined()
      })
    })

    it('all have time set', () => {
      mockUpcomingMatches.forEach(match => {
        expect(match.time).toBeDefined()
        expect(match.time.length).toBeGreaterThan(0)
      })
    })
  })
})
