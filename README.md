# N1 Lab

N-of-1 countermeasure lab. One person designs a randomized ABAB crossover test (intervention vs usual routine), logs an outcome every day or imports a wearable CSV, and gets a Bayesian answer that accounts for day-to-day autocorrelation: keep it, drop it, or extend the test.

Stack: React 18 + Vite, Express 4, MongoDB (Mongoose), JWT in an httpOnly cookie.

## Run it

Needs Node 18.17+ (22 is fine). Mongo is optional, see below.

    npm run setup
    npm run dev

Open http://localhost:5173. Create an account, then press "Load sample mission" on the board to get a half-finished experiment with 75 days of data.

API runs on :5000, the Vite dev server proxies /api to it. Everything needed is already in the zip: `server/.env` ships with working dev defaults.

### Database

`server/.env` points at `mongodb://127.0.0.1:27017/n1lab`. Pick one:

- `docker compose up -d` starts Mongo on 27017 (compose file is in the root).
- Already have Mongo running locally, nothing to do.
- Nothing installed: in development the API falls back to an in-memory Mongo (downloads a mongod binary on first use) and warns loudly. Data is gone when you stop it. Set `MEMORY_FALLBACK=0` to turn that off, or `MONGO_URI=memory` to force it.

### Seeded demo user

    npm run seed

Creates `demo@n1lab.space` / `orbit-demo-1` with the sample experiment.

### Production-ish run

    npm start

Builds the client, then Express serves `client/dist` and the API from one port. Set a real `JWT_SECRET` and `NODE_ENV=production` first, the server refuses to boot with the dev secret.

## How the test works

Schedule (`server/src/lib/schedule.js`): `pairs` pairs of blocks, each pair is A then B or B then A decided by a seeded coin flip. Washout days sit between every two blocks and are excluded from analysis. Extending a test appends another randomized pair.

Model (`server/src/lib/stats.js`): for each logged non-washout day

    y_t = b0 + b1 * B_t + b2 * trend_t + e_t,   e_t ~ AR(1) with correlation phi^(gap in days)

Given phi the posterior is closed form (normal-inverse-gamma, after whitening the AR(1) noise). phi is integrated out on a 0 to 0.95 grid, so the effect posterior is a mixture of Student-t distributions. Quantiles come from the mixture CDF, no MCMC, runs in a few ms. The test suite checks that 80% intervals cover the truth about 80% of the time.

Verdict (`server/src/lib/verdict.js`): you set the smallest benefit worth keeping (delta).

- keep when P(benefit > delta) is at least 90%
- drop when it is at most 10%
- otherwise extend, with a rough estimate of how many more days it takes

All numbers are reported as "benefit", so for metrics where lower is better (resting HR, glucose) positive still means better.

## Layout

    server/src
      index.js, app.js, db.js, config.js
      models/        User, LogEntry, Experiment
      routes/        auth, logs, experiments, demo
      middleware/    auth (cookie + JWT), errors (request log, error handler)
      lib/           stats, verdict, analysis, schedule, dates, demo data
    server/test      node:test suites (npm test)
    client/src
      pages/         Landing, Auth, Dashboard, Logs, NewExperiment, Experiment
      components/    Starfield, Globe, Charts (hand-written SVG), Shell, ...
      styles/        base.css (tokens, controls), app.css (pages, charts)

## API

All under `/api`, JSON, cookie session.

    POST   /auth/register | /auth/login | /auth/logout      GET /auth/me
    GET    /logs?from&to     GET /logs/metrics
    PUT    /logs/:date       DELETE /logs/:date     POST /logs/bulk
    GET    /experiments?today=YYYY-MM-DD
    POST   /experiments      GET|DELETE /experiments/:id
    POST   /experiments/:id/decision   { action: keep | drop | extend, days?, note? }
    POST   /experiments/:id/reopen
    POST   /demo/load        GET /health

## Debugging

- `LOG_LEVEL=debug` (default in dev) prints every request with status and timing. Use `info` to quiet it.
- 5xx responses include the stack in development only.
- `GET /api/health` returns 503 when Mongo is down, the top bar in the app polls it.
- `npm test` runs the schedule, model calibration and verdict tests.
- Validation errors come back as `{ message, fields: { "design.pairs": "..." } }` and the forms show them inline.

## Design notes

Palette is a mission-control console: deep spruce background, frost text, one amber lamp colour, green/red only for keep/drop. Display type is Big Shoulders Display, body is Public Sans, both from Google Fonts (needs internet on first load, system fonts are the fallback). Motion respects `prefers-reduced-motion`.
