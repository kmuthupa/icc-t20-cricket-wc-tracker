export interface TeamStanding {
  position: number
  team: string
  played: number
  won: number
  lost: number
  nrr: string
  points: number
}

export interface GroupStandings {
  group: string
  teams: TeamStanding[]
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

export const mockStandings: GroupStandings[] = [
  {
    group: 'Group A',
    teams: [
      { position: 1, team: 'India', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 2, team: 'Pakistan', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 3, team: 'USA', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 4, team: 'Netherlands', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 5, team: 'Namibia', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
    ]
  },
  {
    group: 'Group B',
    teams: [
      { position: 1, team: 'Australia', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 2, team: 'Sri Lanka', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 3, team: 'Zimbabwe', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 4, team: 'Ireland', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 5, team: 'Oman', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
    ]
  },
  {
    group: 'Group C',
    teams: [
      { position: 1, team: 'England', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 2, team: 'West Indies', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 3, team: 'Scotland', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 4, team: 'Nepal', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 5, team: 'Italy', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
    ]
  },
  {
    group: 'Group D',
    teams: [
      { position: 1, team: 'South Africa', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 2, team: 'New Zealand', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 3, team: 'Afghanistan', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 4, team: 'UAE', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 5, team: 'Canada', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
    ]
  },
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
