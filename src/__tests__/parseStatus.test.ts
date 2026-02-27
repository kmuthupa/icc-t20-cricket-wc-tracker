import { parseStatus } from '../lib/scraper'

describe('parseStatus', () => {
  describe('completed status', () => {
    it('detects "won" results', () => {
      expect(parseStatus('India won by 14 runs')).toBe('completed')
      expect(parseStatus('England won by 5 wickets')).toBe('completed')
      expect(parseStatus('Australia won via Super Over')).toBe('completed')
    })

    it('detects "tied" results', () => {
      expect(parseStatus('Match tied')).toBe('completed')
      expect(parseStatus('Match tied (DLS)')).toBe('completed')
    })

    it('detects "complete" results', () => {
      expect(parseStatus('Match complete')).toBe('completed')
      expect(parseStatus('Game completed')).toBe('completed')
    })

    it('detects "drawn" results', () => {
      expect(parseStatus('Match drawn')).toBe('completed')
    })

    it('detects "no result"', () => {
      expect(parseStatus('No result')).toBe('completed')
      expect(parseStatus('No result - rain')).toBe('completed')
    })

    it('detects "abandoned" matches', () => {
      expect(parseStatus('Match abandoned')).toBe('completed')
      expect(parseStatus('Match abandoned due to rain')).toBe('completed')
    })

    it('detects "cancelled" matches', () => {
      expect(parseStatus('Match cancelled')).toBe('completed')
    })

    it('detects "beat" results', () => {
      expect(parseStatus('India beat Australia by 5 wickets')).toBe('completed')
    })

    it('detects "defeated" results', () => {
      expect(parseStatus('England defeated Pakistan')).toBe('completed')
    })

    it('detects "washed out" and "washout"', () => {
      expect(parseStatus('Match washed out')).toBe('completed')
      expect(parseStatus('Washout')).toBe('completed')
    })

    it('detects "forfeit" results', () => {
      expect(parseStatus('Match forfeited')).toBe('completed')
      expect(parseStatus('Forfeit')).toBe('completed')
    })

    it('detects "awarded" results', () => {
      expect(parseStatus('Match awarded to India')).toBe('completed')
    })

    it('detects DLS results', () => {
      expect(parseStatus('India won (DLS method)')).toBe('completed')
      expect(parseStatus('England won by DLS')).toBe('completed')
      expect(parseStatus('India won (D/L method)')).toBe('completed')
    })

    it('detects "match over"', () => {
      expect(parseStatus('Match over')).toBe('completed')
      expect(parseStatus('match over')).toBe('completed')
    })

    it('is case-insensitive', () => {
      expect(parseStatus('INDIA WON BY 14 RUNS')).toBe('completed')
      expect(parseStatus('MATCH ABANDONED')).toBe('completed')
    })
  })

  describe('live status', () => {
    it('detects "live" indicator', () => {
      expect(parseStatus('Live')).toBe('live')
      expect(parseStatus('Live - Day 1')).toBe('live')
    })

    it('detects innings references', () => {
      expect(parseStatus('1st Innings')).toBe('live')
      expect(parseStatus('2nd Innings')).toBe('live')
    })

    it('detects "break"', () => {
      expect(parseStatus('Innings break')).toBe('live')
    })

    it('detects toss results', () => {
      expect(parseStatus('India opt to bat')).toBe('live')
      expect(parseStatus('England elected to bowl')).toBe('live')
      expect(parseStatus('India chose to bat')).toBe('live')
    })

    it('detects "won the toss" as live, not completed', () => {
      expect(parseStatus('India won the toss and elected to bat')).toBe('live')
      expect(parseStatus('NZ won the toss and chose to bowl')).toBe('live')
      expect(parseStatus('Toss: India opted to bat first')).toBe('live')
    })

    it('detects score-based status as live', () => {
      expect(parseStatus('NZ 159/7 (20 Ovs)')).toBe('live')
      expect(parseStatus('ENG 47/2 (6.0 Ovs)')).toBe('live')
      expect(parseStatus('IND 186-4 (18.2)')).toBe('live')
      expect(parseStatus('PAK 95/3 (12)')).toBe('live')
    })

    it('detects batting/bowling', () => {
      expect(parseStatus('India batting')).toBe('live')
      expect(parseStatus('Australia bowling')).toBe('live')
    })

    it('detects chase scenarios', () => {
      expect(parseStatus('Target: 180')).toBe('live')
      expect(parseStatus('India need 45 runs in 30 balls')).toBe('live')
    })
  })

  describe('upcoming status (default)', () => {
    it('returns upcoming for scheduled matches', () => {
      expect(parseStatus('Tomorrow, 14:00 IST')).toBe('upcoming')
      expect(parseStatus('Feb 6, 19:00 IST')).toBe('upcoming')
    })

    it('returns upcoming for unrecognized status text', () => {
      expect(parseStatus('Starts at 2:00 PM')).toBe('upcoming')
    })
  })

  describe('edge cases: no false positives', () => {
    it('does not match "overs" as "match over"', () => {
      // "overs" should NOT trigger the "match over" regex
      // But "need" will trigger live status for this text
      expect(parseStatus('need 45 in 3 overs')).toBe('live')
    })

    it('does not classify "match overview" as completed', () => {
      // "match over" regex uses word boundary, so "overview" should not match
      // This falls through to upcoming
      expect(parseStatus('match overview')).toBe('upcoming')
    })
  })
})
