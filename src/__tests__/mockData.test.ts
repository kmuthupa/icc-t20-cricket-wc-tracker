import {
  mockStandings,
  mockLiveMatches,
  mockRecentResults,
  mockUpcomingMatches,
} from '../lib/mockData'

describe('mockData', () => {
  describe('mockStandings', () => {
    it('has Group A and Group B standings', () => {
      expect(mockStandings).toHaveLength(2)
      const groupNames = mockStandings.map(g => g.group)
      expect(groupNames).toContain('Group A')
      expect(groupNames).toContain('Group B')
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

    it('validates winProbability if present', () => {
      mockLiveMatches.forEach(match => {
        if (match.winProbability) {
          expect(typeof match.winProbability.team1).toBe('number')
          expect(typeof match.winProbability.team2).toBe('number')
          expect(match.winProbability.team1 + match.winProbability.team2).toBeLessThanOrEqual(100)
        }
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
