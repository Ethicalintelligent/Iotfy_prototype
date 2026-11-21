# Iterations: every change, measured

Every change to the prototype is recorded here, whether Claude Code or a developer made it.
Each one gets a folder:

```
iterations/
  IT-0001/
    record.json     type, module, requirement, phase times, rounds, bugs, remarks, commits
    before-1.png    the screen before the change (more than one for workflows)
    after-1.png     the same screen after the change
  config.json       currency and the team's hourly rate (for "cost saved")
  report.html       the generated report (run: pnpm iter report)
```

## Change types

| Type | Examples |
|---|---|
| **ui** (UI/CSS) | colours, fonts, spacing, button styles, card sizes, alignment, responsiveness |
| **functional** | add or change buttons and actions, validations, filters, search, dropdowns, fewer clicks |
| **major** | a new module, a whole workflow redesigned, database or API changes, end-to-end features |

## How time is measured

The clock runs from `start` to `finish` and is split into phases:

- **understanding**: reading the request and the code
- **implementing**: writing the change
- **fixing**: fixing bugs found along the way
- **testing**: checking it works (preview, tests, screenshots)
- **waiting**: waiting for the person (questions, feedback, approval). Kept separate; not counted as development time.

Each time the person asks for a correction, that counts as another **round**.
Bugs found later, after an iteration was completed, are logged with `--later` on that iteration.

## Comparing with the development team

The report compares Claude Code with manual development in two ways:

1. **Measured**: a developer doing a change by hand records it with
   `pnpm iter start --tool manual ...` and the same phase commands.
2. **Estimated**: a developer looks at a Claude iteration and enters how long it would have taken them:
   `pnpm iter estimate IT-0007 3` (hours). Do this before seeing Claude's time, so the estimate isn't anchored.

Set `developerHourlyRate` in `config.json` for the report to show cost saved.

All commands: `pnpm iter help`.
