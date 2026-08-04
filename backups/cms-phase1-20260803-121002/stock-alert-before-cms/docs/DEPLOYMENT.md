# Deployment and Release Guide

## Current model

The repository contains a static PWA. No deployment configuration file is present in the checked-in tree, although project rules refer to an existing Netlify/GitHub deployment setup. Preserve that external setup and do not invent or replace it without an explicit request.

## Release requirements

- Complete the testing checklist in `docs/TESTING.md`.
- Update `version.json` for every release.
- Make every visible runtime version label match `version.json`.
- Update the service-worker cache name when the app shell changes so a new cache can be identified.
- Update install metadata only when appropriate, keeping `manifest.json` consistent.
- Add a release entry to `CHANGELOG.md`.
- Preserve Firebase collection names and document compatibility.
- Preserve the controlled update prompt with **Update now** and **Later**.

## Suggested release sequence

1. Confirm the intended release version and scope.
2. Make only the approved application changes.
3. Synchronize release metadata and visible labels.
4. Run smoke, workflow, Firebase, offline, and installed-PWA checks.
5. Review the final diff for accidental app, Firebase, or deployment changes.
6. Deploy through the existing GitHub/Netlify process.
7. Verify the hosted `version.json` is fresh and not serving stale cached metadata.
8. On a device running the previous release, confirm the prompt appears and test both choices.
9. Monitor staff reports and Firebase data after rollout.

## Update safety

- Do not call `skipWaiting` automatically during service-worker installation.
- Do not clear caches or reload merely because a newer version is detected.
- Apply the new worker/cache only after explicit user confirmation.
- Keep **Later** safe: the current app should continue working until staff chooses to update.

## Rollback

Before release, retain the previously deployed static files and version metadata. If a release causes a severe problem, restore a known-good compatible release through the existing deployment channel, publish a new version identifier so clients can detect it, and verify that no Firebase schema rollback is required. Never “fix” a rollout by deleting production collections or staff records.

## Information still to document

- Exact repository branch and approval policy used for production.
- Netlify site/build settings and publish directory.
- Production URL and responsible maintainers.
- Firestore security-rule deployment process.
- Monitoring and incident contacts.

Add these only from verified project information; do not guess.
