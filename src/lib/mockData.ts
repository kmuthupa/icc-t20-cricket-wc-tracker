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
      { position: 1, team: 'Royal Challengers Bengaluru', played: 1, won: 1, lost: 0, nrr: '+1.850', points: 2 },
      { position: 2, team: 'Chennai Super Kings', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 3, team: 'Rajasthan Royals', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 4, team: 'Punjab Kings', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 5, team: 'Kolkata Knight Riders', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
    ]
  },
  {
    group: 'Group B',
    teams: [
      { position: 1, team: 'Mumbai Indians', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 2, team: 'Gujarat Titans', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 3, team: 'Delhi Capitals', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 4, team: 'Lucknow Super Giants', played: 0, won: 0, lost: 0, nrr: '0.000', points: 0 },
      { position: 5, team: 'Sunrisers Hyderabad', played: 1, won: 0, lost: 1, nrr: '-1.850', points: 0 },
    ]
  },
]

export const mockLiveMatches: Match[] = []

export const mockRecentResults: Match[] = [
  {
    id: '1',
    team1: 'Royal Challengers Bengaluru',
    team2: 'Sunrisers Hyderabad',
    team1Score: '203/4 (15.4)',
    team2Score: '201/9 (20)',
    result: 'Royal Challengers Bengaluru won by 6 wickets',
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    time: '19:30 IST',
    status: 'completed',
  },
]

export const mockUpcomingMatches: Match[] = [
  {
    id: '2',
    team1: 'Mumbai Indians',
    team2: 'Kolkata Knight Riders',
    venue: 'Wankhede Stadium, Mumbai',
    time: 'Mar 29, 19:30 IST',
    status: 'upcoming',
  },
  {
    id: '3',
    team1: 'Rajasthan Royals',
    team2: 'Chennai Super Kings',
    venue: 'ACA Stadium, Guwahati',
    time: 'Mar 30, 19:30 IST',
    status: 'upcoming',
  },
  {
    id: '4',
    team1: 'Punjab Kings',
    team2: 'Gujarat Titans',
    venue: 'IS Bindra Stadium, Chandigarh',
    time: 'Mar 31, 19:30 IST',
    status: 'upcoming',
  },
  {
    id: '5',
    team1: 'Lucknow Super Giants',
    team2: 'Delhi Capitals',
    venue: 'BRSABV Ekana Stadium, Lucknow',
    time: 'Apr 1, 19:30 IST',
    status: 'upcoming',
  },
]
