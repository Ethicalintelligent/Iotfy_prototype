# IoTIFY Prototype – How to Deploy

Change a file, commit, push. Vercel builds and deploys automatically. You do not click Deploy again.

| Item | Value |
|---|---|
| GitHub repo | `Rafiq400/iotify-prototype` |
| Live branch | `main` |
| Vercel project | `eit14/iotify-prototype` (team EIT) |
| Live site | https://iotify-prototype.vercel.app |
| Apps | `/admin` · `/partner` · `/customer` |
| Database | Neon project `iotify-prototypes`, branch **staging**, database `neondb` |
| Site sign-in | any username + the `STAGING_PASSWORD` value |

---

## 1. Normal update (goes live)

```bash
# 1. Get the latest code
git checkout main
git pull

# 2. Change your files, then check them locally (optional)
pnpm install
pnpm dev            # runs all apps locally

# 3. Commit
git add .
git commit -m "Short description of the change"

# 4. Push – this starts the deploy
git push origin main
```

After the push:
1. Vercel picks it up within a few seconds and starts building.
2. The build takes about 1–3 minutes.
3. When it shows **Ready**, the live site is updated.

Watch it at: https://vercel.com/eit14/iotify-prototype/deployments

---

## 2. Safer update (test first, then go live)

Use a branch when the change is risky.

```bash
git checkout -b feature/my-change
# ...edit files...
git add .
git commit -m "My change"
git push origin feature/my-change
```

- Vercel builds a **Preview** deployment with its own address (shown in Vercel and on the GitHub pull request).
- Open the preview, sign in, and check it.
- If it's fine, open a Pull Request on GitHub and **merge into `main`**. The merge deploys it live.

---

## 3. Check after every deploy

- [ ] Vercel deployment status is **Ready** (not Error)
- [ ] https://iotify-prototype.vercel.app/admin opens
- [ ] https://iotify-prototype.vercel.app/partner opens
- [ ] https://iotify-prototype.vercel.app/customer opens
- [ ] Pages show data (the database connection works)

---

## 4. If something goes wrong

| Problem | What to do |
|---|---|
| Deployment shows **Error** | Vercel → Deployments → open it → **Build Logs**. Fix the error, commit and push again. |
| Site is broken after a deploy | Vercel → Deployments → pick the last good one → **⋯ → Promote to Production** (or **Instant Rollback** on Overview). |
| "Staging is closed" message | `STAGING_PASSWORD` is missing. Add it in Vercel → Settings → Environment Variables, then redeploy. |
| No data / database errors | Check `DATABASE_URL` in Vercel → Settings → Environment Variables. It must point to the Neon **staging** branch (host starts `ep-rapid-fog`). |
| Push didn't trigger a deploy | Check that you pushed to `main`, and that Vercel → Settings → Git still shows the repo connected. |

---

## 5. Changing a secret (env variable)

1. Vercel → **iotify-prototype → Settings → Environment Variables**.
2. Edit `DATABASE_URL` or `STAGING_PASSWORD` and save.
3. Secrets only apply to **new** deployments: go to **Deployments → latest → ⋯ → Redeploy**.

Never put these values in the code or commit them to GitHub.

---

## 6. Rules

- Push to `main` = live. Only push what's ready.
- The site uses the Neon **staging** database, never `main`.
- Keep the password gate on. It also protects `/api/sql`, which can query the database.
- The database login is currently `neondb_owner` (full access). Switch to a limited role (`iotify_prototyper` with a password) when you can.
