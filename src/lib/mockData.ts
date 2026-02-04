export interface TeamStanding {
  position: number
  team: string
  played: number
  won: number
  lost: number
  nrr: string
  points: number
}

export interface Match {
  id: string
  team1: string
  team2: string
  team1Score?: string
  team2Score?: string
  result?: string
  venue: string
  time: string
  status: 'completed' | 'live' | 'upcoming'
}

export const mockStandings: TeamStanding[] = [
  { position: 1, team: 'India', played: 3, won: 3, lost: 0, nrr: '+1.85', points: 6 },
  { position: 2, team: 'Australia', played: 3, won: 2, lost: 1, nrr: '+1.20', points: 4 },
  { position: 3, team: 'England', played: 3, won: 2, lost: 1, nrr: '+0.65', points: 4 },
  { position: 4, team: 'South Africa', played: 3, won: 2, lost: 1, nrr: '+0.42', points: 4 },
  { position: 5, team: 'Pakistan', played: 3, won: 1, lost: 2, nrr: '-0.35', points: 2 },
  { position: 6, team: 'New Zealand', played: 3, won: 1, lost: 2, nrr: '-0.58', points: 2 },
  { position: 7, team: 'West Indies', played: 3, won: 1, lost: 2, nrr: '-0.92', points: 2 },
  { position: 8, team: 'Sri Lanka', played: 3, won: 0, lost: 3, nrr: '-1.45', points: 0 },
]

export const mockTodayMatches: Match[] = [
  {
    id: '1',
    team1: 'India',
    team2: 'Australia',
    team1Score: '186/4 (20)',
    team2Score: '172/8 (20)',
    result: 'India won by 14 runs',
    venue: 'Melbourne Cricket Ground',
    time: '14:00 IST',
    status: 'completed',
  },
  {
    id: '2',
    team1: 'England',
    team2: 'South Africa',
    team1Score: '165/6 (18.2)',
    team2Score: '158/4 (20)',
    venue: 'Sydney Cricket Ground',
    time: '19:00 IST',
    status: 'live',
  },
]

export const mockUpcomingMatches: Match[] = [
  {
    id: '3',
    team1: 'Pakistan',
    team2: 'New Zealand',
    venue: 'Adelaide Oval',
    time: 'Tomorrow, 14:00 IST',
    status: 'upcoming',
  },
  {
    id: '4',
    team1: 'West Indies',
    team2: 'Sri Lanka',
    venue: 'Perth Stadium',
    time: 'Tomorrow, 19:00 IST',
    status: 'upcoming',
  },
  {
    id: '5',
    team1: 'India',
    team2: 'England',
    venue: 'Melbourne Cricket Ground',
    time: 'Feb 6, 14:00 IST',
    status: 'upcoming',
  },
  {
    id: '6',
    team1: 'Australia',
    team2: 'Pakistan',
    venue: 'Brisbane Cricket Ground',
    time: 'Feb 6, 19:00 IST',
    status: 'upcoming',
  },
]
