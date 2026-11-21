# Developer branches

Every developer has **one personal branch**. You work, commit and push **only to your own branch**. There is no shared development branch.

## Who works on which branch

| Developer | Branch | Commits and pushes allowed |
|---|---|---|
| Irfan | `irfan` | Irfan only |
| Nadim | `nadim` | Nadim only |
| Rafiq | `rafiq` | Rafiq only |

## Rules for every developer

1. Work only on **your** branch. Commit only to **your** branch. Push only to **your** branch.
2. Never commit or push to another developer's branch, even for a small fix. If their branch needs a change, ask them.
3. Never commit or push directly to `main`. Your work reaches `main` through a **pull request** from your branch, which is reviewed and then merged.
4. Bring the latest `main` into your branch regularly (at least daily), so your work doesn't drift away from everyone else's.

## Rules for Claude Code

Claude Code follows the same rules as the developer it is working for.

1. **At the start of every session**, find out whose session this is:
   - Read `git config iotify.branch`. That is this computer's assigned branch.
   - If it is empty, ask "Which developer are you: Irfan, Nadim or Rafiq?", then save the answer with `git config iotify.branch <branch>` so it isn't asked again.
2. Make sure the current branch is the assigned one (`git branch --show-current`). If it isn't, switch to it before changing anything.
3. Commit and push **only** to the assigned branch.
4. Never switch to, commit to, merge into or push to another developer's branch or `main`. If a request needs that, stop and explain in plain words.
5. To share finished work: open a pull request from the assigned branch into `main`.
6. To get the latest work from others: merge `main` into the assigned branch.

The developer never needs to type these commands. Claude Code runs them.

## Everyday flow

| You want to… | Tell Claude Code | What happens |
|---|---|---|
| Start working | "Start my session" | Checks you're on your branch and brings in the latest `main` |
| Save a step | "Commit this" | Commits to your branch and pushes it |
| Share finished work | "Send my work to main" | Opens a pull request from your branch into `main` |
| Get others' work | "Update from main" | Merges the latest `main` into your branch |

## Adding a new developer

Add a row to the table above, create a branch named after the developer from the latest `main`, and give them this file.
