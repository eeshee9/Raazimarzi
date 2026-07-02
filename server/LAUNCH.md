# RaaziMarzi Server — Launch Runbook

## Ownership

| Role | Name | Email | Responsibility |
|---|---|---|---|
| Launch owner | Mohit Nagpure | mohit@eagleeyedigital.io | Go/no-go decision, pilot coordination |
| Technical owner | Ishita Vishwakarma | ishita.vishwakarma@eagleeyedigital.io | Server ops, deployments, incident response |
| Support escalation | Ishita Vishwakarma | ishita.vishwakarma@eagleeyedigital.io | First line of support for all technical issues |

> If the server goes down or a critical bug is reported, contact Ishita Vishwakarma first.
> For business/access decisions, escalate to Mohit Nagpure.

## Environment Setup

Copy `.env.example` (if exists) or ensure `.env` has all required vars:

```
MONGO_URI=...
JWT_SECRET=...
PORT=5000
NODE_ENV=production
ENABLE_MEDIATOR_PORTAL=false    ← keep false until mediator module officially launches
NEEV_ENDPOINT=...
NEEV_BUCKET=...
NEEV_ACCESS_KEY=...
NEEV_SECRET_KEY=...
EMAIL_HOST=...
EMAIL_USER=...
EMAIL_PASS=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

## Starting the Server

### Option A — PM2 (recommended for production)

```bash
cd server
npm install -g pm2
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save          # persist across reboots
pm2 startup       # generate OS startup script
```

### Option B — Direct Node (dev/testing)

```bash
cd server
node src/server.js
```

## Checking Server Health

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"OK","database":"Connected",...}
```

## Restarting on Failure

```bash
pm2 restart raazimarzi-api
# or, if PM2 is not running:
pm2 start ecosystem.config.cjs
```

View logs:
```bash
pm2 logs raazimarzi-api --lines 100
# or directly:
tail -f server/logs/error.log
```

## Reverting a Release

```bash
# 1. Stop the server
pm2 stop raazimarzi-api

# 2. Revert to previous commit
git revert HEAD         # creates a new revert commit (safe)
# or
git reset --hard HEAD~1 # destructive — only use if commit was never pushed

# 3. Restart
pm2 start ecosystem.config.cjs
```

## Mediator Portal Rollout Control

The mediator portal access is controlled by `ENABLE_MEDIATOR_PORTAL` in `.env`.

- `ENABLE_MEDIATOR_PORTAL=false` — approved mediators get "portal not yet live" message; no access
- `ENABLE_MEDIATOR_PORTAL=true`  — approved mediators can log in and use all mediator routes

**To enable the mediator portal:**
1. Set `ENABLE_MEDIATOR_PORTAL=true` in `.env`
2. Restart the server: `pm2 restart raazimarzi-api`

This flag is checked at request time (not cached), so a restart is required.

## Uptime Monitoring

**Active monitor:** GitHub Actions workflow `.github/workflows/health-monitor.yml`
- Polls `https://raazimarzi.com/api/health` every 5 minutes
- Checks HTTP 200 AND `"database":"Connected"` in response body
- GitHub emails alert owners on first failure
- Monitor status: https://github.com/eagleeye-2022/Raazimarzi-V1/actions/workflows/health-monitor.yml
- Alert recipients: mohit@eagleeyedigital.io, ishita.vishwakarma@eagleeyedigital.io

Manually trigger a health check run:
```
gh workflow run health-monitor.yml
```

Secondary / backup monitoring (optional upgrade):
- UptimeRobot (free) — https://uptimerobot.com → point to https://raazimarzi.com/api/health, 5-min interval

## Rate Limiter Reset

The auth rate limiter is in-memory. If a user is locked out and cannot wait 15 minutes:
```bash
pm2 restart raazimarzi-api   # resets all in-memory limiters
```

For production scale, switch `authLimiter` to a Redis-backed store (`rate-limit-redis`).

## Launch Checklist

- [ ] `ENABLE_MEDIATOR_PORTAL=false` confirmed in `.env`
- [ ] `NODE_ENV=production` set
- [ ] MongoDB Atlas connection verified (`/api/health` → `"database":"Connected"`)
- [ ] Email (SMTP) tested on startup log
- [ ] Twilio tested on startup log
- [ ] PM2 running and `pm2 save` executed
- [x] `/api/health` monitored externally (GitHub Actions health-monitor.yml, every 5 min)
