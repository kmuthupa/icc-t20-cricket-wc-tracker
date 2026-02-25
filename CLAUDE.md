# CLAUDE.md

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm test         # Jest tests (always run before pushing)
npm run lint     # ESLint
```

Use `source ~/.nvm/nvm.sh && nvm use 20` before all npm/node commands.

## Workflow

- **Always run `npm test` before pushing.** Do not push if tests fail.

## Architecture

Next.js app that scrapes Cricbuzz for ICC T20 World Cup 2026 data (standings + matches), falling back to mock data when scraping fails.

```
src/
├── app/
│   ├── page.tsx              # Main UI
│   ├── layout.tsx            # Root layout
│   └── api/cricket/route.ts  # GET endpoint — scrapes or returns mock data
└── lib/
    ├── scraper.ts            # Cheerio-based Cricbuzz scraper
    ├── mockData.ts           # Types (TeamStanding, GroupStandings, Match) + mock data
    └── __tests__/
        └── scraper.test.ts   # Unit tests (axios mocked)
```

- `scraper.ts` exports: `scrapeStandings`, `scrapeMatches`, `scrapeMatchScore`, `parseStatus`, `expandTeamName`
- API route tries live scrape first, sets `usingMockData: true` on fallback

## Testing

- Jest + ts-jest, config in `jest.config.js`
- `@/` path alias mapped via `moduleNameMapper`
- Mock `axios` for scraper tests, mock `@/lib/scraper` for API route tests
