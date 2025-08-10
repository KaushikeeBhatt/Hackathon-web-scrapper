# Automation & Environment

## Lambda scheduler

- File: `lambda-scheduler.js`
- Export: `exports.handler = async (event) => { ... }`
- Purpose: Creates a short-lived EC2 instance to run the scraper/API in a headless/ephemeral fashion.

Required environment variables:
- `AWS_REGION` (default `us-east-1`)
- `KEY_PAIR_NAME`
- `SECURITY_GROUP_ID`
- `IAM_INSTANCE_PROFILE`

Behavior:
- Finds latest Amazon Linux 2 AMI
- Boots `t3.micro` with cloud-init user data:
  - Installs Node.js and Git
  - Downloads app artifact from S3
  - `npm install`
  - Writes a minimal `.env`
  - Runs `node server.js`
  - Waits briefly then shuts the instance down

Returns JSON with `instanceId`, `publicIp`, and timestamp.

## Server shutdown flags

- `AUTO_SHUTDOWN`: `true`/`false` (default false). When true, the server exits automatically after initial scrape.
- `SHUTDOWN_DELAY`: Milliseconds before auto-shutdown (default `30000`).

Manual shutdown endpoint is available via `POST /api/shutdown`.

## Cleanup retention settings

The API applies retention during `/api/cleanup-old` and status updates:

- `CLEANUP_EXPIRED_AFTER_DAYS`: Days to retain expired entries (default `30`).
- `CLEANUP_INACTIVE_AFTER_DAYS`: Days to retain entries without a deadline (default `90`).

These are read from environment variables by `server.js`.

## Ports

- The application listens on port `3001` (constant in `server.js`).

## Related

- See `AWS_DEPLOYMENT_GUIDE.md` for a full deployment walkthrough.