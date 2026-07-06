# AHNi Health Financing Situation Analysis

A Next.js (React) app for the **Health Financing & Domestic Resource Mobilization
Situation Analysis** (GHSD Transition Readiness Assessment). It renders the full
A–K assessment form, auto-saves drafts in the browser, exports to PDF, and
**submits responses to a PostgreSQL database** via a serverless API route.
Deployable to Vercel as-is.

---

## What's inside

```
app/
  page.jsx              Form page (React)
  layout.jsx            App shell
  globals.css           AHNi-branded styles
  api/submit/route.js   POST endpoint -> inserts a submission
  api/health/route.js   GET endpoint -> checks DB connectivity
components/
  AssessmentForm.jsx    The full form (all sections, submit, draft save/load)
lib/
  formModel.js          Form definition (sections, fields, options)
  db.js                 Neon serverless SQL client
db/
  schema.sql            Database schema (hf_submission table + view)
scripts/
  init-db.mjs           Applies schema.sql to your database
public/
  ahni-logo.png         AHNi logo
.env.example            Connection-string template
```

---

## 1. The connection string

The app uses the **Neon serverless driver** and reads a standard PostgreSQL
connection string from the `DATABASE_URL` environment variable. Copy
`.env.example` to `.env.local` and paste your Neon string
(Neon Console → your project → **Connection Details**):

```
# Format
DATABASE_URL='postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require&channel_binding=require'
```

Parts: `USER`/`PASSWORD` = Neon role + secret · host ends in `.neon.tech`
(use the **-pooler** host) · `DBNAME` = database · `sslmode=require` +
`channel_binding=require` = enforced by Neon. If you attach **Vercel Postgres**
instead, Vercel injects `POSTGRES_URL` and the app falls back to it.

> **Security:** keep this string server-side only. Never commit real credentials
> (`.env.local` is git-ignored) and never reference `DATABASE_URL` from a client
> component. If a password is ever exposed, reset it in Neon → Roles.
>
> **Not using Neon?** The `neon()` driver only speaks to Neon endpoints. For a
> generic/self-hosted Postgres, swap `lib/db.js` back to the `pg` Pool.

---

## 2. Create the database table

With `DATABASE_URL` set:

```bash
npm install
npm run db:init        # applies db/schema.sql
```

(Or run `db/schema.sql` yourself via `psql`, pgAdmin, or your provider's SQL editor.)

---

## 3. Run locally

```bash
npm run dev
# open http://localhost:3000
# check the DB is reachable:  http://localhost:3000/api/health
```

Fill the form and click **Submit** — a row is inserted into `hf_submission`.
**Save draft** downloads the responses as JSON; **Load draft** restores them.

---

## 4. Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Vercel: **New Project → Import** the repo (framework auto-detects Next.js).
3. Add the database:
   - **Easiest:** Vercel dashboard → **Storage → Create → Postgres**, link it to the
     project. Vercel sets `POSTGRES_URL` for you.
   - **Or bring your own:** Project → **Settings → Environment Variables** →
     add `DATABASE_URL` with your connection string.
4. Create the table once (either `npm run db:init` locally against the same
   database, or paste `db/schema.sql` into the provider's SQL editor).
5. **Deploy.** Your form is live; submissions land in Postgres.

CLI alternative:

```bash
npm i -g vercel
vercel                       # link & deploy a preview
vercel env add DATABASE_URL  # paste your connection string
vercel --prod                # production deploy
```

---

## Data model

Each submission is stored as JSONB (`meta` + `answers`) plus generated columns
(state, assessor, date) for querying. `answers` keys match the `field_id`s in
`lib/formModel.js`. The `hf_answer_long` view unnests answers into one row per
field for reporting/BI. See `db/schema.sql`.
