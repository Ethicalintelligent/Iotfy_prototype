# IoTIFY Prototype – How to Deploy

Change a file, commit, push. Vercel builds and deploys automatically. You do not click Deploy again.

| Item | Value |
|---|---|
| GitHub repo | `Ethicalintelligent/Iotfy_prototype` (public) |
| Live branch | `main` |
| Vercel account / team | `eit15` (team **EIT**, Hobby plan) |
| Vercel project | `iotfy-prototype` |
| Live site | https://iotfy-prototype.vercel.app |
| Apps | `/admin` · `/partner` · `/customer` |
| Database | Neon project `iotify-prototypes`, branch **staging**, database `neondb` |
| Site sign-in | any username + the `STAGING_PASSWORD` value (stored in Vercel, not in this file) |

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

Watch it at: https://vercel.com/eit15/iotfy-prototype/deployments

---

## 2. Safer update (test first, then go live)

Use a separate branch when the change is risky.

```bash
git checkout -b feature/my-change
# ...edit files...
git add .
git commit -m "My change"
git push origin feature/my-change
```

- **Only `main` deploys.** Pushes to any other branch (`dev/…`, `admin/…`, `feature/…`) do not start a Vercel build. This is set in `vercel.json` (`git.deploymentEnabled`).
- Check your change locally (`pnpm dev`), then open a Pull Request on GitHub and **merge it into `main`**. The merge deploys it live.
- Need a preview of a branch anyway? Deploy it by hand (section 5).

---

## 3. Check after every deploy

- [ ] Vercel deployment status is **Ready** (not Error)
- [ ] https://iotfy-prototype.vercel.app/admin opens
- [ ] https://iotfy-prototype.vercel.app/partner opens
- [ ] https://iotfy-prototype.vercel.app/customer opens
- [ ] Pages show data (the database connection works)

---

## 4. If something goes wrong

| Problem | What to do |
|---|---|
| Deployment shows **Error** | Vercel → Deployments → open it → **Build Logs**. Fix the error, commit and push again. |
| Site is broken after a deploy | Vercel → Deployments → pick the last good one → **⋯ → Promote to Production** (or **Instant Rollback** on Overview). |
| "Staging is closed" message | `STAGING_PASSWORD` is missing. Add it in Vercel → Settings → Environment Variables, then redeploy. |
| No data / database errors | Check `DATABASE_URL` in Vercel → Settings → Environment Variables. It must point to the Neon **staging** branch (host starts `ep-rapid-fog`). |
| Push didn't trigger a deploy | Expected on any branch except `main` (see `git.deploymentEnabled` in `vercel.json`). On `main`: check you pushed to the **live branch** (Vercel → Settings → Environments → Production → Branch Tracking shows which one), and that Settings → Git still shows the repo connected. |
| Deploy blocked: "private GitHub organization requires Pro" | The repo was made private again. Keep it public, or upgrade the Vercel team to Pro. |

---

## 5. Deploy a branch by hand (no push needed)

Vercel → **Deployments → ⋯ (top right) → Create Deployment** → pick the branch → **Deploy to Production**.

---

## 6. Changing a secret (environment variable)

1. Vercel → **iotfy-prototype → Settings → Environment Variables**.
2. Edit `DATABASE_URL` or `STAGING_PASSWORD` and save.
3. Secrets only apply to **new** deployments: **Deployments → latest → ⋯ → Redeploy**.

Tip for adding several at once: paste `NAME=value` lines (one per line) into the **Key** box. Vercel splits them into Key and Value for you.

Never put these values in the code or commit them to GitHub. The repo is public.

---

## 7. Which branch is live

Vercel → **Settings → Environments → Production → Branch Tracking** shows the live branch. It is set to `main`. If you ever change it, the branch you pick is the one whose pushes go live.

---

## 8. Rules

- A push to the live branch goes live. Only push what's ready.
- The site uses the Neon **staging** database, never `main`.
- Keep the password gate on. It also protects `/api/sql`, which can query the database.
- The repo is public: anyone can read the code, so secrets live only in Vercel.
- The database login is currently `neondb_owner` (full access). Switch to a limited role when you can, and change the password if it has been shared.
