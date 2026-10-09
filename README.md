# N1 Lab

Small crews can't run proper studies. Four to six people is nowhere near enough for a population trial, so this app flips it around: each person runs their own experiment on themselves and gets an answer that's only about them.

You pick a countermeasure (a sleep schedule, an exercise routine, caffeine timing, anything you can switch on and off), the app builds a randomized ABAB schedule with washout days, you log one outcome a day, and it tells you something like "deep sleep up about 11 min, 80% interval 2 to 20, not conclusive yet". Then you keep it, drop it, or extend the test.

It started as a space-crew idea but the same thing works on the ground. Someone with a chronic condition can test whether a diet or when they take a medication actually makes a difference for them.

Live: https://countermeasure-lab-space.vercel.app

Backend is on Render's free tier, so if nobody has touched it for 15 minutes the first request takes 30 to 50 seconds. Just wait it out.

## Stack

React + Vite on the front, Express + Mongoose on the back, MongoDB Atlas for the database. Auth is a JWT in an httpOnly cookie. CSS is written by hand, charts are plain SVG, the starfield is canvas. No UI kit, no stats library; the Bayesian model, verdict rules and schedule randomizer are all in `server/`.

The model treats consecutive days as correlated (an AR(1)-style noise term) instead of independent, because sleep and mood on Tuesday say a lot about Wednesday. Ignoring that makes the intervals way too confident.

## Run it locally

Node 18+ and a Mongo instance. `docker-compose.yml` starts one if you don't have Atlas.

    git clone https://github.com/deonarayankumar269-sketch/countermeasure-lab-space.git
    cd countermeasure-lab-space
    npm install
    cp server/.env.example server/.env
    npm run dev

Client on :5173, API on :5000. If `dev` isn't the script name, check the root package.json.

Env vars in `server/.env`:

    PORT=5000
    NODE_ENV=development
    MONGO_URI=mongodb://localhost:27017/n1lab
    JWT_SECRET=<long random string>
    JWT_DAYS=7
    CLIENT_ORIGIN=http://localhost:5173
    LOG_LEVEL=debug
    ENABLE_DEMO=1
    MEMORY_FALLBACK=0

Put the database name at the end of `MONGO_URI`. I forgot once and everything went into `test`. For `JWT_SECRET`:

    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

`ENABLE_DEMO=1` turns on the "load sample mission" button on the board. Switch it off if real people are using the site. `.env` is gitignored, keep it that way.

## Trying it out

Load the sample mission from the board to see a finished experiment with charts and a verdict. To test the import, upload `sample-wearable.csv` on the daily log page. Or just make an account and run the 3-step wizard.

## Tests

    npm test

18 tests on the stats engine, verdict rules and randomizer. One of them simulates a lot of datasets and checks that the 80% intervals actually contain the true effect about 80% of the time, which is the one I care about most.

## Deploy

Vercel for the client, Render for the API, Atlas for the DB.

Vercel: Root Directory `client`, Vite preset, build `npm run build`, output `dist`. The API calls are proxied through `client/vercel.json`, so the browser only talks to the Vercel domain and the auth cookie stays first-party. Trying to call Render directly from the Vercel site means cross-site cookies and a lot of pain.

    {
      "rewrites": [
        { "source": "/api/:path*", "destination": "https://countermeasure-lab-space.onrender.com/api/:path*" },
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }

Render needs `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL, no trailing slash) and `ENABLE_DEMO`. Express runs with `trust proxy` on because Render sits behind a proxy and the rate limiter breaks without it.

`GET /api/health` should return `{"ok":true,"db":"up"}`. First thing to check when something's off.

## Things to know

Short experiments come back inconclusive almost every time. Three or four blocks is about the minimum before the interval means much. That's the model being honest, not a bug.

This helps one person decide something about their own routine. It's not medical advice, and if it's about medication, talk to your doctor before changing anything.
