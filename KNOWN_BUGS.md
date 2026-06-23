# Known Bugs and Risks

This file records confirmed defects and code-level risks. Reproduce a problem before moving it into the confirmed section.

## Confirmed from repository inspection

### Version metadata is inconsistent

- `version.json` and the visible runtime constants identify version 7.8.
- `manifest.json` still names the application “Stock Alert V6.0 Stable UX Fix.”
- Risk: installed-app metadata can show a stale version name.

### Runtime logic is duplicated

- `index.html` contains the application JavaScript inline.
- `app.js` contains a substantially overlapping copy, but `index.html` does not currently load it.
- Risk: changing only `app.js` may have no effect, while changing only the inline code can leave the duplicate stale. Always identify the active implementation before editing.

### Legacy supplier sentinel values remain in code paths

- Several legacy paths use Thai text meaning “not specified” as stored supplier data.
- Later compatibility patches attempt to present an empty field to users.
- Risk: old and new records may represent a missing supplier differently. Any cleanup must preserve Firebase compatibility and be migration-safe.

## Needs reproduction

- Confirm behavior when Firebase initializes successfully but later listeners fail and the app falls back to local data.
- Confirm multi-device behavior for purchase orders, deliveries, categories, suppliers, and transfer history.
- Confirm that accepting a similar product from the other branch groups it consistently across shortage, ordering, and transfer workflows.
- Confirm that selecting one supplier for a multi-supplier item removes that item from every other supplier ordering choice.

## Reporting a bug

Record the app version, device/browser, branch, exact steps, expected result, actual result, screenshots or console errors, data impact, and whether the issue also occurs after reopening the app. Never include private shop data or credentials.
