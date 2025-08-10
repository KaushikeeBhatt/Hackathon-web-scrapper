# Design Hackathon API (Pixel War Backend)

A Node.js/Express service that scrapes design-focused hackathons and competitions from multiple sources and exposes them via a simple HTTP API.

- Project root: `server.js`
- Aggregated scraping entry: `design-hackathon-scraper/allHackathon.js`
- Individual scrapers: `design-hackathon-scraper/*Scraper.js`
- Keyword utilities: `design-hackathon-scraper/designKeywords.js`
- Automation: `lambda-scheduler.js`

## Quick start

- Install dependencies:
  ```bash
  npm install
  ```
- Start the API:
  ```bash
  npm run dev
  ```
- Verify health:
  ```bash
  curl -s http://localhost:3001/api/health | jq
  ```

The API listens on port `3001`.

## Documentation

- API reference: `./API.md`
- Data model: `./DataModel.md`
- Scrapers and modules: `./Scrapers.md`
- Automation & environment: `./Automation.md`
- Utility scripts: `./Scripts.md`

## At a glance

- Primary endpoint to fetch current data: `GET /api/hackathons`
- Trigger fresh scrape: `POST /api/scrape`
- Stats & insights: `GET /api/stats`
- Deduplicate existing data: `POST /api/cleanup`
- Update/refresh existing entries: `POST /api/update`
- Cleanup old/expired entries: `POST /api/cleanup-old`

## Related guides in repo

- AWS deployment guide: `AWS_DEPLOYMENT_GUIDE.md`
- Design sources and references: `DESIGN_HACKATHON_SOURCES.md`
- Cleanup configuration notes: `cleanup-config.md`