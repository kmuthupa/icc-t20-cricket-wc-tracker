# CLAUDE.md

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build (Turbopack)
npm test         # Jest tests (always run before pushing)
npm run lint     # ESLint
```

Use `source ~/.nvm/nvm.sh && nvm use 20` before all npm/node commands.

## Workflow

- **Always run `npm test` and `npm run build` before pushing.** Do not push if either fails.
- Create feature branches from latest `origin/main` — never reuse old merged branches.
- Commit with clear messages explaining the "why", not just the "what".

## Architecture

Next.js app that fetches IPL 2026 data (standings + matches) from ESPNCricinfo JSON API (primary), with Cricbuzz HTML scraping as fallback, and mock data as final fallback.

```
src/
├── app/
│   ├── page.tsx                  # Main UI (client component)
│   ├── globals.css               # Warm light theme with contextual pastels
│   ├── layout.tsx                # Root layout
│   └── api/cricket/route.ts      # GET endpoint — scrapes or returns mock data
├── lib/
│   ├── scraper.ts                # Cheerio-based Cricbuzz scraper
│   └── mockData.ts               # Types + mock data (fallback)
└── __tests__/                    # Unit tests (parseStatus, expandTeamName, scrapeMatches, etc.)
```

### Key exports from `scraper.ts`

- `scrapeStandings()` — Scrapes points table, returns `GroupStandings[]` or `null`
- `scrapeMatches()` — Returns `{ live, recent, upcoming }` or `null`
- `scrapeMatchScore(href)` — Fetches live score page, returns `{ team, score }[]` or `null`
- `parseStatus(text)` — Classifies match status: `'completed' | 'live' | 'upcoming'`
- `expandTeamName(abbr)` — Maps IPL franchise abbreviations (MI, CSK, RCB, etc.) to full names

### API response shape

```typescript
{
  standings: GroupStandings[]     // Group A + Group B (or Points Table)
  liveMatches: Match[]           // Currently in progress (max 5)
  recentResults: Match[]         // Completed matches (max 3)
  upcomingMatches: Match[]       // Scheduled matches (max 6)
  usingMockData: boolean         // true if any scrape failed
  lastUpdated: string            // ISO timestamp
}
```

### Match status classification (`parseStatus`)

This is the core gate for separating matches. The default fallback is `'upcoming'`, so any unrecognized status text becomes an upcoming match.

**Completed keywords:** won, tied, complete, drawn, no result, abandoned, cancelled, beat, defeated, washed out, washout, forfeit, awarded, dls, d/l, `\bmatch over\b` (word-boundary to avoid "overs")

**Live keywords:** live, innings, break, opt to, elected to, batting, bowling, target, need

**Important:** "super over" is NOT in the completed list — live super overs should stay as live. The "won" keyword catches completed super over results.

### Data separation rules

Matches are split into three separate arrays — never combined:
- `live` — status is `'live'`, max 5
- `recent` — status is `'completed'`, max 3
- `upcoming` — status is `'upcoming'`, max 6

### IPL teams

10 franchises split into 2 groups (A & B):
- **Group A:** CSK, RCB, RR, PBKS, KKR
- **Group B:** MI, GT, DC, SRH, LSG

### Score attribution

Live match scores are fetched from individual match pages. Scores are matched to the correct team using `expandTeamName()` — the score page returns abbreviations (e.g. "MI", "CSK") that must map to the full team names used in match objects.

## UI / CSS

- **Theme:** Warm light — off-white `#fafaf9` background, white `#ffffff` cards, warm gray text
- **Contextual pastel card headers:**
  - `.card-header-live` — Rose/red for live matches
  - `.card-header-results` — Sage green for recent results
  - `.card-header-upcoming` — Sky blue for upcoming fixtures
- No dark mode. No hover lift effects. Only subtle blink animation for the live dot.
- Uses CSS custom properties (`:root` vars) for all colors.

## Testing

- Jest + ts-jest, config in `jest.config.js`
- `@/` path alias mapped via `moduleNameMapper`
- Mock `axios` for scraper tests, mock `@/lib/scraper` for API route tests
- Test files in both `src/__tests__/` and `src/lib/__tests__/`

### Test file map

| File | Tests |
|------|-------|
| `src/__tests__/parseStatus.test.ts` | All completion/live/upcoming keywords + edge cases |
| `src/__tests__/expandTeamName.test.ts` | IPL franchise abbreviation mapping |
| `src/__tests__/scrapeMatches.test.ts` | Separation, limits, dedup, non-IPL filter |
| `src/__tests__/scrapeStandings.test.ts` | Parsing, Points Table, qualifier tags, error handling |
| `src/__tests__/mockData.test.ts` | Data structure validation (2 groups, 5 teams each) |
| `src/lib/__tests__/scraper.test.ts` | Integration-style tests with realistic HTML mocks |
| `src/app/api/__tests__/route.test.ts` | API route with mocked scraper + mock data fallback |

## Common pitfalls

- **`parseStatus` default fallback:** Unrecognized status text falls through to `'upcoming'`. When adding new completion/live keywords, add tests first.
- **Word boundary for "match over":** Uses `/\bmatch over\b/` regex — bare `includes('over')` would false-positive on "overs" in live match text.
- **Score page team matching:** `scrapeMatchScore` returns abbreviations. Always use `expandTeamName()` when comparing to match team names.
- **Duplicate hrefs:** Cricbuzz pages often repeat links. The scraper deduplicates via `seenHrefs` Set.
- **Data sources:** ESPNCricinfo API (series ID `1510719`) is primary. Cricbuzz (series ID `9241`, slug `indian-premier-league-2026`) is fallback. Mock data is final fallback.
- **Cricbuzz Cloudflare:** Cricbuzz uses Cloudflare which blocks server-side requests. ESPNCricinfo API (`hs-consumer-api.espncricinfo.com`) has no such protection.
