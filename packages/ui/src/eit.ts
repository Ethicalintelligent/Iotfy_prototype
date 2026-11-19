// Link point for the EIT UI library (its own Git repository).
//
// To link it while developing:
//   1. Clone it beside this repo:   ../eit-ui
//   2. Add it to pnpm-workspace.yaml: - ../eit-ui
//   3. In packages/ui/package.json, dependencies: "@eit/ui": "workspace:*"
//   4. Replace the line below with:  export * from '@eit/ui';
//   5. Remove local components from ./components that the library now provides,
//      and update CATALOGUE.md so each entry says where it comes from.
// Edits in ../eit-ui then hot-reload in every app. When the library is published
// as a package later, only step 3 changes (a version instead of workspace:*).
export {};
