# How to start, build and merge an IoTIFY prototype

This guide is for designers, analysts and developers working with Claude. Read `CORE_RULES.md` (database) and the root `CLAUDE.md` (code) first.

## Start a prototype
In the Claude desktop app's Code tab, open the repository folder and ask:

> Start a new IoTIFY prototype for *Indoor Asset Tracking* following CLAUDE.md and docs/CORE_RULES.md.

Claude will:
1. Create a Git branch `proto/indoor-asset-tracking`.
2. Create Neon branch `proto/indoor-asset-tracking` from `main`, and on it run `SET ROLE iotify_prototyper; SELECT public.new_prototype('indoor asset tracking');`.
3. Point your `.env.local` at that Neon branch.
4. Work only in the product's folder under `products/` and in `db/migrations/indoor-asset-tracking/`.

## Build it
- Describe screens and data in plain language. Watch the live preview update after each prompt.
- UI comes from `@iotify/ui` (the EIT UI library). If a component is missing, Claude adds it to the library first.
- New tables go in your `proto_` schema, linked to `core`, each change saved as a numbered migration file.

## Submit it
Say "submit for review". Claude commits, pushes the branch and opens a pull request. The core owner reviews and merges.

## Merge it (core owner)
1. Check the code against `CLAUDE.md` and the migration files against `CORE_RULES.md`.
2. Run the migrations in order on `main` under `SET ROLE iotify_prototyper;`, and record each in `public.merge_log`.
3. Merge the pull request. Delete the Neon branch.

## After any merge or core change
Other prototypes refresh their branch from the new `main`, then re-run their own migration files. That is why the files must be safe to run twice.
