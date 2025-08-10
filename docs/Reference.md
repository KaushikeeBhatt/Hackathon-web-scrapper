# Developer Reference

List of exported/public functions and modules.

## Aggregator

- `getAllHackathons(): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/allHackathon.js`
  - Scrapes all sources and returns a merged, score-sorted list of design-focused items.

## Keyword utilities

- `designKeywords: string[]`
- `isDesignHackathon(hackathon: Partial<Hackathon>): boolean`
- `getDesignRelevanceScore(hackathon: Partial<Hackathon>): number`
  - Module: `design-hackathon-scraper/designKeywords.js`
  - Used across all scrapers to filter and score entries.

## Scrapers

- `scrapeDevpostDesignHackathons(pages: number = 3): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/devpostScraper.js`
- `scrapeUnstopDesignHackathons(searchTerm: string = 'design', pages: number = 1): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/unstopScraper.js`
- `scrapeCumulusDesignCompetitions(): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/cumulusDesignCompetitions.js`
- `scrapeAllHackathonsDesign(): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/allHackathonWeb.js`
- `scrapeDevfolioDesignHackathons(pages: number = 2): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/devfolioScraper.js`
- `scrapeHackathonComDesignHackathons(pages: number = 2): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/hackathonComScraper.js`
- `scrapeHackerEarthDesignHackathons(pages: number = 2): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/hackerEarthScraper.js`
- `scrapeTopcoderDesignChallenges(pages: number = 2): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/topcoderScraper.js`
- `scrape99designsContests(pages: number = 2): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/99designsScraper.js`
- `scrapeMLHEvents(pages: number = 2): Promise<Hackathon[]>`
  - Module: `design-hackathon-scraper/mlhScraper.js`

## AWS Lambda

- `handler(event: any): Promise<{ statusCode: number; body: string }>`
  - Module: `lambda-scheduler.js`
  - Creates an EC2 instance, runs the app, and returns instance metadata.

## Example imports

```js
const getAllHackathons = require('./design-hackathon-scraper/allHackathon');
const { isDesignHackathon, getDesignRelevanceScore } = require('./design-hackathon-scraper/designKeywords');
const scrapeDevpost = require('./design-hackathon-scraper/devpostScraper');
```