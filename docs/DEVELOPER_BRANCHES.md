# Developer branches and databases

Every developer gets their **own branch**, a **separate branch for Neno** (their Claude Code), and their **own database**. Nobody's work touches anyone else's. There is no shared development branch, and nobody works on `main` directly.

## What each developer gets

Example for **Nadim**:

| What | Name | Created from | Who uses it |
|---|---|---|---|
| Developer branch | `dev/nadim` | latest `main` | Nadim only |
| Neno branch | `neno/nadim` | latest `main` | Nadim's Claude Code only |
| Database | `iotfy_nadim` (a Neon branch) | Neon `main`: the core schema, roles and demo data | Nadim and Nadim's Neno |

To see who is set up, look at the branches named `dev/…` on GitHub.

## How work moves

```
neno/nadim ──pull request──▶ dev/nadim ──pull request──▶ main
 (Neno works here)          (Nadim reviews Neno's work)   (reviewed, then merged)
```

- Neno never changes `dev/nadim` directly. It opens a pull request, and Nadim decides.
- Nadim never pushes to `main` directly. Nadim opens a pull request, and it's reviewed.
- To get everyone else's latest work: merge `main` into `dev/nadim`, then `dev/nadim` into `neno/nadim`.

## Rules (for people and for Neno)

1. Commit and push **only** to your own branch: `dev/<you>` for the developer, `neno/<you>` for Neno.
2. Never commit or push to another developer's branch, to the other half of your own pair, or to `main`.
3. Use only your own database (`iotfy_<you>`). Never connect to another developer's database or to Neon `main` (see `docs/CORE_RULES.md`).
4. Core database rules still apply on your own database: `SET ROLE iotify_prototyper;`, never change `core` structure, new tables in `proto_<name>`, every change a numbered file in `db/migrations/<name>/`.

**This is enforced, not just written down.** Every copy of the project checks each commit and push (`tools/git-hooks`). A wrong branch is refused with a plain message, for example: *Push to "dev/nadim" refused. You are assigned to "neno/nadim" and may push only there.*

## On the developer's computer

There are two project folders:

| Folder | Branch | Used by |
|---|---|---|
| `iotify-prototype` | `dev/<you>` | the developer |
| `iotify-prototype-neno` | `neno/<you>` | Neno (Claude Code): open this folder when working with Claude |

Both folders use the developer's own database.

### Everyday phrases

| You want to… | Tell Claude Code |
|---|---|
| Get set up the first time | "Start my session, I'm Nadim" |
| Save a step | "Commit this" |
| Hand Neno's work to the developer | "Send this to my branch" (pull request `neno/…` → `dev/…`) |
| Share finished work | "Send my work to main" (pull request `dev/…` → `main`) |
| Get others' latest work | "Update from main" |

---

## Instructions for Claude Code

### Setting up a developer (admin, on the admin's computer)

When the admin says "set up developer <Name>":

1. `pnpm dev:setup <Name> --check`. If it reports a branch as already existing, **stop**, show the warning and change nothing.
2. Neon project `iotify-prototypes` (`empty-sea-69531006`): list the branches. If `iotfy_<name>` already exists, **stop**, warn and change nothing.
3. Create the Neon branch `iotfy_<name>` from parent `main`, with a compute endpoint.
4. `pnpm dev:setup <Name>`: creates `dev/<name>` and `neno/<name>` from the latest `main` on GitHub.
5. Give the admin a short hand-over message to send to the developer: the branch names, the database name, the rules above, and "open the project and tell Claude: Start my session, I'm <Name>". **Never include a connection string.**

Neon allows about 10 branches on the current plan. If creating one fails for that reason, say so plainly.

### Start of every session (developer's computer)

1. Read `git config iotify.branch`.
   - **Empty, first time:** ask the developer's name if it isn't given, then run `pnpm dev:join <Name>`. Get the connection string for Neon branch `iotfy_<name>` (role `iotify_dev`, database `neondb`) through the Neon connection, and write it as `DATABASE_URL` into `.env.local` in **both** folders. Never print it or show it on screen.
   - **`dev/<name>`:** this is the developer's folder. Don't change files here. Tell the developer to open the `-neno` folder for work with Claude.
   - **`neno/<name>`:** this is your folder. Work here.
2. Check that `git branch --show-current` equals `iotify.branch`. If it doesn't, switch back before doing anything.
3. Commit and push only to that branch. Never use `--no-verify` or otherwise get around the branch check. If a request needs another branch, stop and explain.
