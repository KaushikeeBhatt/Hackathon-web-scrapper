# Scrapers and Modules

All scrapers return a Promise resolving to an array of normalized hackathon objects focused on design-related entries. Design filtering is applied using `designKeywords.isDesignHackathon` and each entry gets `designRelevanceScore`.

## Aggregator

- `getAllHackathons(): Promise<Hackathon[]>`
  - File: `design-hackathon-scraper/allHackathon.js`
  - Runs all individual scrapers sequentially and merges results, sorted by `designRelevanceScore`.

Example:
```js
const getAllHackathons = require('../design-hackathon-scraper/allHackathon');

(async () => {
  const items = await getAllHackathons();
  console.log('Total design hackathons:', items.length);
})();
```

## Individual scrapers

Each function can accept optional paging parameters where applicable (defaults shown below). They launch a headless Chromium via Puppeteer.

- `scrapeDevpostDesignHackathons(pages = 3)`
  - File: `design-hackathon-scraper/devpostScraper.js`
  - Source: Devpost
- `scrapeUnstopDesignHackathons(searchTerm = 'design', pages = 1)`
  - File: `design-hackathon-scraper/unstopScraper.js`
  - Source: Unstop
- `scrapeCumulusDesignCompetitions()`
  - File: `design-hackathon-scraper/cumulusDesignCompetitions.js`
  - Source: Cumulus Association
- `scrapeAllHackathonsDesign()`
  - File: `design-hackathon-scraper/allHackathonWeb.js`
  - Source: AllHackathons
- `scrapeDevfolioDesignHackathons(pages = 2)`
  - File: `design-hackathon-scraper/devfolioScraper.js`
  - Source: Devfolio
- `scrapeHackathonComDesignHackathons(pages = 2)`
  - File: `design-hackathon-scraper/hackathonComScraper.js`
  - Source: Hackathon.com
- `scrapeHackerEarthDesignHackathons(pages = 2)`
  - File: `design-hackathon-scraper/hackerEarthScraper.js`
  - Source: HackerEarth
- `scrapeTopcoderDesignChallenges(pages = 2)`
  - File: `design-hackathon-scraper/topcoderScraper.js`
  - Source: Topcoder
- `scrape99designsContests(pages = 2)`
  - File: `design-hackathon-scraper/99designsScraper.js`
  - Source: 99designs
- `scrapeMLHEvents(pages = 2)`
  - File: `design-hackathon-scraper/mlhScraper.js`
  - Source: MLH

Example usage for a specific scraper:
```js
const scrapeDevpost = require('../design-hackathon-scraper/devpostScraper');

(async () => {
  const items = await scrapeDevpost(2);
  console.log('Devpost design hackathons:', items.length);
})();
```

## Keyword utilities

- `designKeywords: string[]`
- `isDesignHackathon(h: Partial<Hackathon>): boolean`
- `getDesignRelevanceScore(h: Partial<Hackathon>): number`
  - File: `design-hackathon-scraper/designKeywords.js`

Example:
```js
const { isDesignHackathon, getDesignRelevanceScore } = require('../design-hackathon-scraper/designKeywords');

const item = { title: 'UI/UX Challenge', description: 'Design a modern app', tags: ['UI','React'] };
console.log(isDesignHackathon(item)); // true
console.log(getDesignRelevanceScore(item)); // 0..1
```