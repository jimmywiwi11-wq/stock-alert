# Roadmap

This roadmap is directional. Priorities require owner approval and should not trigger code changes by themselves.

## Now — Protect the production workflow

- Keep the developer guide current.
- Record verified bugs and release history.
- Maintain version consistency and controlled PWA updates.
- Regress both branches, Firebase sync, ordering, receiving, transfers, copying, and similarity matching on every release.

## Next — Improve confidence

- Add a repeatable automated smoke-test harness for the highest-risk staff workflows.
- Establish a safe test-data strategy separate from real shop records.
- Document the exact Netlify/GitHub release process and Firestore security-rule ownership.
- Audit mobile accessibility, offline recovery, and multi-device synchronization.
- Define compatibility fixtures for legacy Firebase records.

## Later — Reduce maintenance risk

- Plan, approve, and test a gradual consolidation of duplicated logic in `index.html` and `app.js`.
- Introduce clearer module boundaries without changing staff-facing behavior.
- Normalize missing supplier data through a backward-compatible migration plan.
- Add structured error reporting and sync diagnostics that do not expose sensitive shop data.

## Decision gates

Any roadmap item that changes runtime structure, Firebase data, service-worker behavior, or deployment must include acceptance criteria, compatibility impact, rollback steps, and evidence from the full testing checklist. Large refactors must be separate from feature releases.
