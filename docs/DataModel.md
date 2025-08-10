# Data Model

## Files

- Primary dataset: `data/hackathons.json`
- Scraping sessions log: `data/scraping-log.json`

## Hackathon object

Fields are populated opportunistically per source; some may be absent.

- `title` (string): Name of the hackathon/competition
- `link` (string): Canonical URL to the event
- `image` (string): Absolute URL to event image/logo
- `description` (string): Short description
- `host` (string): Organizer name (some sources use `hostedBy`)
- `hostedBy` (string): Alternate host field used by some scrapers
- `prize` (string): Prize or reward info
- `tags` (string[]): Labels/categories/themes from the source
- `source` (string): Origin source, e.g. `Devpost`, `Unstop`, `Cumulus`, `AllHackathons`, `Topcoder`, `99designs`, `MLH`
- `date` (string): Date text as displayed by source (when structured fields are unavailable)
- `applyBy` (YYYY-MM-DD): Application deadline (e.g., from Cumulus)
- `registrationDeadline` (ISO date): Some sources may expose this
- `endDate` (ISO date): Some sources may expose this
- `deadline` (ISO date|null): Normalized deadline inferred from the above fields
- `status` ("active"|"expired"): Derived from `deadline` vs now
- `designRelevanceScore` (number 0..1): Fraction of matched design keywords
- `timeLeft` (string): Source-specific remaining time text
- `registered` (string): Participant count text when present
- `scrapedAt` (ISO date): Time the item was scraped
- `lastUpdated` (ISO date): Time the item was last updated during merging

Example:
```json
{
  "title": "UI/UX Design Challenge",
  "link": "https://devpost.com/hackathons/xyz",
  "image": "https://.../logo.png",
  "description": "Design a modern interface for...",
  "hostedBy": "Acme",
  "prize": "$5,000",
  "tags": ["Design", "UI", "UX"],
  "source": "Devpost",
  "deadline": "2025-03-10T00:00:00.000Z",
  "status": "active",
  "designRelevanceScore": 0.38,
  "scrapedAt": "2025-01-20T12:00:00.000Z",
  "lastUpdated": "2025-01-20T12:00:00.000Z"
}
```

## Logs entry (`scraping-log.json`)

```json
{
  "timestamp": "2025-01-20T12:00:00.000Z",
  "totalHackathons": 123,
  "originalCount": 135,
  "duplicatesRemoved": 12,
  "sources": { "Devpost": 50, "Unstop": 30, "Cumulus": 10, "AllHackathons": 5 }
}
```

## Deduplication key

Case-insensitive key: `title.toLowerCase().trim() + '|' + link.toLowerCase().trim()`.
Items with empty `title` and `link` are ignored during keying.