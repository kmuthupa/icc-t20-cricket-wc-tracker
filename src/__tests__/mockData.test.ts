import {
  mockStandings,
  mockLiveMatches,
  mockRecentResults,
  mockUpcomingMatches,
} from '../lib/mockData'

describe('mockData', () => {
  describe('mockStandings', () => {
    it('has Super 8 and Group stage standings', () => {
      expect(mockStandings.length).toBeGreaterThanOrEqual(4)
      const groupNames = mockStandings.map(g => g.group)
      expect(groupNames).toContain('Group A')
      expect(groupNames).toContain('Group B')
      expect(groupNames).toContain('Group C')
      expect(groupNames).toContain('Group D')
    })

    it('each group has at least 4 teams', () => {
      mockStandings.forEach(group => {
        expect(group.teams.length).toBeGreaterThanOrEqual(4)
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
