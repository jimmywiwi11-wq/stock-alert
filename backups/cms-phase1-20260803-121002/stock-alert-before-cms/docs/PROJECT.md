# Stock Alert Project

## Purpose

Stock Alert is a mobile-first progressive web app used by Chokanan Hardware staff. It records missing and low-stock products for Branch 1 and Branch 2 and supports the operational path from shortage discovery through branch transfer, supplier ordering, receiving, and history.

This is a production shop tool. Data continuity and preservation of familiar staff workflows take priority over broad rewrites.

## Current repository

- `index.html`: active application shell, styles, markup, inline application logic, compatibility patches, Firebase initialization, and update UI.
- `app.js`: overlapping application logic; it is not currently referenced by `index.html`, so do not assume edits here affect the running app.
- `sw.js`: service-worker cache and controlled-update behavior.
- `manifest.json`: PWA install metadata and icon declarations.
- `version.json`: release metadata checked by the app.
- `icons/`: install icons.
- `AGENTS.md`: mandatory working rules for coding agents.
- Root tracking documents: changelog, known bugs, and feature requests.
- `docs/`: developer guide.

## Development principles

1. Read `AGENTS.md` before making changes.
2. Locate the active function and markup before editing; the project contains duplicated and layered code.
3. Make the smallest targeted change that satisfies the request.
4. Preserve existing Firebase collection names and document shapes.
5. Preserve PWA installation and the user-confirmed update flow.
6. Test both branches and adjacent workflows after every code change.
7. Update `version.json`, matching visible labels, and `CHANGELOG.md` for every release.

## Out of scope unless explicitly requested

- Rewriting the application or changing its framework.
- Renaming, deleting, or resetting Firebase collections.
- Changing hosting, GitHub, or Netlify configuration.
- Silent cache replacement or automatic user reload.
- Removing existing screens, controls, or workflows.

## Documentation map

- Architecture and storage: `docs/ARCHITECTURE.md`
- Supported workflows: `docs/FEATURES.md`
- Interface rules: `docs/UI_GUIDELINES.md`
- Verification: `docs/TESTING.md`
- Releases: `docs/DEPLOYMENT.md`
- Direction: `docs/ROADMAP.md`
