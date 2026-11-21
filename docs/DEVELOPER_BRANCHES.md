# Developer branches and databases

Every developer gets **one branch** and **one database**, used by the developer and their Claude Code alike. Nobody's work touches anyone else's. There is no shared development branch, and nobody works on `main` directly.

## What each developer gets

Example for **Nadim**:

| What | Name | Created from | Who uses it |
|---|---|---|---|
| Branch | `dev/nadim` | latest `main` | Nadim and Nadim's Claude Code |
| Database | `iotfy_nadim` (a Neon branch) | Neon `main`: the core schema, roles and demo data | Nadim and Nadim's Claude Code |

To see who is set up, look at the branches named `dev/…` on GitHub.

## How work moves

```
dev/nadim ──pull request──▶ main
 (Nadim and Claude Code work here)   (reviewed, then merged)
```

- Claude Code commits on `dev/nadim` after each working step. Nadim checks the change in the live preview and can ask Claude to correct or undo it.
- Nobody pushes to `main` directly. Nadim opens a pull request, and it's reviewed.
- To get everyone else's latest work: merge `main` into `dev/nadim`.

## Rules (for people and for Claude Code)

1. Commit and push **only** to your own branch, `dev/<you>`.
2. Never commit or push to another developer's branch or to `main`.
3. Use only your own database (`iotfy_<you>`). Never connect to another developer's database or to Neon `main` (see `docs/CORE_RULES.md`).
4. Core database rules still apply on your own database: `SET ROLE iotify_prototyper;`, never change `core` structure, new tables in `proto_<name>`, every change a numbered file in `db/migrations/<name>/`.

**This is enforced, not just written down.** Every copy of the project checks each commit and push (`tools/git-hooks`). A wrong branch is refused with a plain message, for example: *Push to "dev/irfan" refused. You are assigned to "dev/nadim" and may push only there.*

## On the developer's computer

One project folder, `iotify-prototype`, on `dev/<you>`. The developer and Claude Code both work in it, and it uses the developer's own database.

### Everyday phrases

| You want to… | Tell Claude Code |
|---|---|
| Get set up the first time | "Start my session, I'm Nadim" |
| Save a step | "Commit this" |
| Share finished work | "Send my work to main" (pull request `dev/…` → `main`) |
| Get others' latest work | "Update from main" |

---

## Instructions for Claude Code

### Setting up a developer (admin, on the admin's computer)

When the admin says "set up developer <Name>":

1. `pnpm dev:setup <Name> --check`. If it reports the branch as already existing, **stop**, show the warning and change nothing.
2. Neon project `iotify-prototypes` (`empty-sea-69531006`): list the branches. If `iotfy_<name>` already exists, **stop**, warn and change nothing.
3. Create the Neon branch `iotfy_<name>` from parent `main`, with a compute endpoint.
4. `pnpm dev:setup <Name>`: creates `dev/<name>` from the latest `main` on GitHub.
5. Give the admin a short hand-over message to send to the developer: the branch name, the database name, the rules above, and "open the project and tell Claude: Start my session, I'm <Name>". **Never include a connection string.**

Neon allows about 10 branches on the current plan. If creating one fails for that reason, say so plainly.

Developers set up before this change may also have a `neno/<name>` branch and an `iotify-prototype-neno` folder. They are no longer used.

### Start of every session (developer's computer)

1. Read `git config iotify.branch`.
   - **Empty, first time:** ask the developer's name if it isn't given, then run `pnpm dev:join <Name>`. Get the connection string for Neon branch `iotfy_<name>` (role `iotify_dev`, database `neondb`) through the Neon connection, and write it as `DATABASE_URL` into `.env.local`. Never print it or show it on screen.
   - **`dev/<name>`:** this is the developer's folder. Work here.
2. Check that `git branch --show-current` equals `iotify.branch`. If it doesn't, switch back before doing anything.
3. Commit and push only to that branch. Never use `--no-verify` or otherwise get around the branch check. If a request needs another branch, stop and explain.
