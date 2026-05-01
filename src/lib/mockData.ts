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

export interface WinProbability {
  team1: number
  team2: number
  source?: string
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
  winProbability?: WinProbability
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

export const mockLiveMatches: Match[] = [
  {
    id: 'live-1',
    team1: 'Mumbai Indians',
    team2: 'Chennai Super Kings',
    team1Score: '145/3 (15.2)',
    team2Score: '',
    venue: 'Wankhede Stadium, Mumbai',
    time: 'Live',
    status: 'live',
    winProbability: {
      team1: 62,
      team2: 38,
      source: 'ESPNCricinfo'
    }
  }
]

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

export const pslMockStandings: GroupStandings[] = [
  {
    group: 'Points Table',
    teams: [
      { position: 1, team: 'Islamabad United', played: 2, won: 2, lost: 0, nrr: '+0.850', points: 4 },
      { position: 2, team: 'Peshawar Zalmi', played: 2, won: 1, lost: 1, nrr: '+0.120', points: 2 },
      { position: 3, team: 'Multan Sultans', played: 1, won: 1, lost: 0, nrr: '+0.450', points: 2 },
      { position: 4, team: 'Lahore Qalandars', played: 1, won: 0, lost: 1, nrr: '-0.320', points: 0 },
      { position: 5, team: 'Quetta Gladiators', played: 1, won: 0, lost: 1, nrr: '-0.560', points: 0 },
      { position: 6, team: 'Karachi Kings', played: 1, won: 0, lost: 1, nrr: '-0.890', points: 0 },
    ]
  }
]

export const pslMockLiveMatches: Match[] = [
  {
    id: 'psl-live-1',
    team1: 'Islamabad United',
    team2: 'Peshawar Zalmi',
    team1Score: '182/4 (17.5)',
    team2Score: '',
    venue: 'Gaddafi Stadium, Lahore',
    time: 'Live',
    status: 'live',
    winProbability: {
      team1: 75,
      team2: 25,
      source: 'ESPNCricinfo'
    }
  }
]

export const pslMockRecentResults: Match[] = [
  {
    id: 'psl-1',
    team1: 'Multan Sultans',
    team2: 'Karachi Kings',
    team1Score: '165/8 (20)',
    team2Score: '124/10 (18.2)',
    result: 'Multan Sultans won by 41 runs',
    venue: 'National Stadium, Karachi',
    time: '19:30 PKT',
    status: 'completed',
  },
]

export const pslMockUpcomingMatches: Match[] = [
  {
    id: 'psl-2',
    team1: 'Lahore Qalandars',
    team2: 'Quetta Gladiators',
    venue: 'Gaddafi Stadium, Lahore',
    time: 'Mar 29, 19:30 PKT',
    status: 'upcoming',
  },
  {
    id: 'psl-3',
    team1: 'Peshawar Zalmi',
    team2: 'Karachi Kings',
    venue: 'National Stadium, Karachi',
    time: 'Mar 30, 19:30 PKT',
    status: 'upcoming',
  }
]
