'use client'

import { useEffect, useState, useCallback } from 'react'
import { GroupStandings, Match } from '@/lib/mockData'

interface CricketData {
  standings: GroupStandings[]
  liveMatches: Match[]
  recentResults: Match[]
  upcomingMatches: Match[]
  usingMockData: boolean
  lastUpdated: string
}

function StandingsTable({ group, muted }: { group: GroupStandings; muted?: boolean }) {
  return (
    <div className="card">
      <div className={muted ? 'card-header-muted' : 'card-header'}>{group.group}</div>
      <div className="card-body">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th className="text-center">P</th>
              <th className="text-center">W</th>
              <th className="text-center">L</th>
              <th className="text-right">NRR</th>
              <th className="text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team) => (
              <tr key={`${group.group}-${team.position}`}>
                <td>{team.position}</td>
                <td>{team.team}</td>
                <td className="text-center">{team.played}</td>
                <td className="text-center">{team.won}</td>
                <td className="text-center">{team.lost}</td>
                <td className="text-right">{team.nrr}</td>
                <td className="text-right"><strong>{team.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<CricketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cricket')
      if (!res.ok) throw new Error('Failed to fetch data')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError('Failed to load data. Retrying...')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading cricket data...</div>
      </div>
    )
  }

  const super8Groups = data?.standings.filter(g => g.group.startsWith('Super 8')) ?? []
  const groupStageGroups = data?.standings.filter(g => g.group.startsWith('Group')) ?? []

  return (
    <div className="container">
      <header>
        <h1>ICC T20 World Cup 2026</h1>
        <p>Super 8 Stage · Live Standings, Results & Fixtures</p>
      </header>

      {error && <div className="error">{error}</div>}

      {data?.usingMockData && (
        <div className="notice">
          Showing cached data. Live data will appear once available.
        </div>
      )}

      {/* Super 8 standings */}
      <div className="section-title">Super 8 Standings</div>
      <div className="grid">
        {super8Groups.map((group) => (
          <StandingsTable key={group.group} group={group} />
        ))}

        {data?.liveMatches && data.liveMatches.length > 0 && (
          <div className="card">
            <div className="card-header">Live Matches</div>
            <div className="card-body">
              {data.liveMatches.map((match) => (
                <div key={match.id} className="match-item">
                  <div className="match-teams">
                    <span>{match.team1} vs {match.team2}</span>
                    <span className="status-live">LIVE</span>
                  </div>
                  {match.team1Score && (
                    <div className="match-score">
                      {match.team1}: {match.team1Score}
                      {match.team2Score && <> · {match.team2}: {match.team2Score}</>}
                    </div>
                  )}
                  <div className="match-details">{match.venue}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">Recent Results</div>
          <div className="card-body">
            {data?.recentResults.length === 0 ? (
              <p className="text-center" style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
                No recent results
              </p>
            ) : (
              data?.recentResults.map((match) => (
                <div key={match.id} className="match-item">
                  <div className="match-teams">
                    <span>{match.team1} vs {match.team2}</span>
                  </div>
                  {(match.team1Score || match.team2Score) && (
                    <div className="match-score">
                      {match.team1Score && <>{match.team1}: {match.team1Score}</>}
                      {match.team2Score && <> · {match.team2}: {match.team2Score}</>}
                    </div>
                  )}
                  {match.result && <div className="match-result">{match.result}</div>}
                  <div className="match-details">{match.venue}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Upcoming Fixtures</div>
          <div className="card-body">
            {data?.upcomingMatches.length === 0 ? (
              <p className="text-center" style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
                No upcoming matches
              </p>
            ) : (
              data?.upcomingMatches.map((match) => (
                <div key={match.id} className="match-item">
                  <div className="match-teams">{match.team1} vs {match.team2}</div>
                  <div className="match-details">{match.time}</div>
                  <div className="match-details">{match.venue}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Group Stage results */}
      {groupStageGroups.length > 0 && (
        <>
          <div className="section-title">Group Stage Results</div>
          <div className="grid">
            {groupStageGroups.map((group) => (
              <StandingsTable key={group.group} group={group} muted />
            ))}
          </div>
        </>
      )}

      {data?.lastUpdated && (
        <div className="last-updated">
          Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          {' · '}Auto-refreshes every 2 minutes
        </div>
      )}
    </div>
  )
}
