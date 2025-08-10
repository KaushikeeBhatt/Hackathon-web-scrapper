# Utility Scripts

## Cleanup existing data

- File: `cleanupExistingData.js`
- Purpose: Re-scans `data/hackathons.json`, filters to design-related entries, computes `designRelevanceScore`, sorts by score, and saves back.

Run:
```bash
node cleanupExistingData.js
```

Output includes counts and a top-5 list by design relevance.

## Simple API test

- File: `testAPI.js`
- Purpose: Minimal GET `/api/health` example using Node `http`.

Run (after starting the server):
```bash
node testAPI.js
```

Example output:
```
Status: 200
Headers: { ... }
Response: { status: 'ok', ... }
```