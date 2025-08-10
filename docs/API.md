# HTTP API Reference

Base URL: `http://localhost:3001`

## Endpoints

- GET `/api/health`: Service health and index.
- GET `/api/hackathons`: Latest saved hackathon dataset.
- POST `/api/scrape`: Trigger fresh scraping and persist results.
- GET `/api/stats`: Aggregated scraping and design stats.
- POST `/api/cleanup`: Deduplicate current dataset (by title+link).
- POST `/api/update`: Refresh existing entries with new scrape and status updates.
- POST `/api/cleanup-old`: Remove old expired/inactive entries based on retention.
- POST `/api/shutdown`: Graceful server shutdown (primarily for automation).

---

## GET /api/health

Returns service status and a list of available endpoints.

Example:
```bash
curl -s http://localhost:3001/api/health | jq
```

Response (200):
```json
{
  "status": "ok",
  "message": "Design Hackathon API is running 🚀",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": {
    "health": "/api/health",
    "hackathons": "/api/hackathons",
    "scrape": "/api/scrape",
    "stats": "/api/stats",
    "cleanup": "/api/cleanup"
  }
}
```

## GET /api/hackathons

Returns the latest saved dataset from `data/hackathons.json`. If empty, instructs to run `/api/scrape`.

Example:
```bash
curl -s http://localhost:3001/api/hackathons | jq '.hackathons | length'
```

Responses:
- 200: JSON object with `timestamp`, `totalCount`, and `hackathons` array.
- 404: `{ "error": "No hackathon data found. Run /api/scrape first." }`

## POST /api/scrape

Triggers a fresh scrape from all sources, merges with existing data (deduplicates), updates statuses, and persists.

Example:
```bash
curl -sX POST http://localhost:3001/api/scrape | jq '.data.totalCount'
```

Response (200):
```json
{
  "message": "Scraping completed successfully",
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "totalCount": 123,
    "hackathons": [ { "title": "..." } ]
  }
}
```

## GET /api/stats

Returns scraping session stats and design-specific summary.

Example:
```bash
curl -s http://localhost:3001/api/stats | jq
```

Shape:
```json
{
  "totalScrapingSessions": 3,
  "latestScraping": { "timestamp": "...", "totalHackathons": 100, "sources": { "Devpost": 40, "Unstop": 20 } },
  "averageHackathonsPerSession": 100,
  "designStats": {
    "totalDesignHackathons": 120,
    "sources": { "Devpost": 50, "Unstop": 30 },
    "averageRelevanceScore": 0.42,
    "topDesignHackathons": [ { "title": "...", "score": 0.88, "source": "Devpost" } ]
  }
}
```

## POST /api/cleanup

Deduplicates the current dataset (case-insensitive `title|link` key) and persists the cleaned data.

Example:
```bash
curl -sX POST http://localhost:3001/api/cleanup | jq
```

Response (200):
```json
{
  "message": "Cleanup completed successfully",
  "originalCount": 140,
  "finalCount": 123,
  "duplicatesRemoved": 17
}
```

## POST /api/update

Refreshes existing entries by scraping again and merging significant changes (prize, deadline, description, tags). Status is recalculated and old entries optionally removed by dedicated cleanup.

Example:
```bash
curl -sX POST http://localhost:3001/api/update | jq '.data.totalCount'
```

## POST /api/cleanup-old

Removes:
- Expired hackathons whose deadline is older than `CLEANUP_EXPIRED_AFTER_DAYS`.
- Inactive (no deadline) entries whose `lastUpdated` is older than `CLEANUP_INACTIVE_AFTER_DAYS`.

Example:
```bash
curl -sX POST http://localhost:3001/api/cleanup-old | jq
```

Response shape includes counts and effective settings.

## POST /api/shutdown

Requests the server to shut down. Useful when running headless in automation. Response is returned before shutdown.

Example:
```bash
curl -sX POST http://localhost:3001/api/shutdown | jq
```