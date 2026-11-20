# Staging server (the shared demo)

One web address where everyone sees the latest merged version of all three apps, with demo data.
It is the **same React code** as `pnpm dev`, built for the web. Nothing is rewritten.

| Address | App |
|---|---|
| `/` | Start page with the three links |
| `/admin/` | Admin console |
| `/partner/` | Partner portal |
| `/customer/` | Customer apps (My apps and every product, e.g. `/customer/app/N004`) |

## How it works

- **Host:** Vercel, free (Hobby) plan for now. Vercel rebuilds and redeploys automatically
  after every merge to `main`. Each pull request also gets its own preview address.
- **Build:** `pnpm build:staging` builds each app with Vite mode `staging` (served under `/admin/`,
  `/partner/` and `/customer/`), then `tools/staging/assemble.js` puts them in `dist-staging/` and
  checks that no database secret is in the files sent to browsers.
- **Data:** the apps send their database requests to `/api/sql`, a small Vercel function
  (`api/sql.js`, which runs `packages/data/server/handler.js`). The connection string is a secret
  stored at Vercel (`DATABASE_URL`). It is never in the code or the browser.
- **Statement check:** the function accepts only the kinds of SQL the apps make (reading and
  saving rows of `core` tables) and refuses anything else, such as creating or dropping tables,
  other schemas, `SET ROLE` or several statements in one request (`packages/data/server/allow.js`).
  Every statement also runs as the locked `iotify_prototyper` role.
- **Password:** every page, file and `/api/sql` needs the staging password first. The browser
  asks once. Any user name works; the password is the Vercel secret `STAGING_PASSWORD`. Without
  that secret the site stays closed (`middleware.js`, `tools/staging/password.js`).
- **Database:** its own Neon branch **`staging`** (`br-nameless-smoke-bd14v7h7`), copied from
  `main` on 20 Nov 2026. Never `main`, never `test/e2e`. Changes made on staging stay on staging.

## One-time setup (about 10 minutes, in the browser)

1. **Vercel account:** sign up at vercel.com with GitHub ("Continue with GitHub").
2. **Import the project:** Add New → Project → pick `iotify-prototype` → leave every setting as it
   is (they come from `vercel.json`) → but **before Deploy**, open **Environment Variables**.
3. **Add two secrets** (Environment Variables):
   - `DATABASE_URL`: the connection string of the Neon branch **staging**. In the Neon console:
     project iotify-prototypes → **Connect** → branch **staging** → role **iotify_prototyper**
     → copy. Paste it only into Vercel, never into a chat, a document or Git.
   - `STAGING_PASSWORD`: a password you choose for the site. Share it only with people who
     should see the demo.
4. **Deploy.** Vercel shows the address (for example `iotify-prototype.vercel.app`). Open it,
   enter any name and the password.

After that, every merge to `main` updates staging by itself, in about a minute.

## Trying it on the laptop

`pnpm build:staging`, then `pnpm staging:preview` (http://localhost:4180) runs the built site with
the same password check, function and addresses as Vercel. It uses `STAGING_DATABASE_URL` from
`.env.local` if present, otherwise the test branch (`TEST_DATABASE_URL`), never `main`. The
password is `STAGING_PASSWORD` from `.env.local`, otherwise `preview`.

## Later: Vercel Pro

Vercel's free plan is for personal, non-commercial use, so move to Pro before using staging for
company work. On Pro you can also switch on Vercel's own **Password Protection** (Project →
Settings → Deployment Protection) and then remove `middleware.js` and `tools/staging/password.*`.
