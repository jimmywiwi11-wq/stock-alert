# Testing Guide

## Testing approach

No automated test suite or package-based test runner is visible in the repository. Until one is added, use focused browser checks plus the full release regression checklist. Test on a narrow mobile viewport and, before release, on at least one real installed PWA device.

## Before testing

- Note the current `version.json` value.
- Use non-production test records where possible.
- Test online Firebase behavior and an offline/local fallback separately.
- Preserve a way to identify and remove test records without touching real shop data.
- Open the browser console and record any errors.

## Smoke test after every code change

1. Open the app and confirm there are no JavaScript errors.
2. Confirm the home screen and bottom navigation are usable.
3. Create an out-of-stock item in Branch 1.
4. Create a low-stock item in Branch 2 using combined quantity/unit input.
5. Edit an existing item and confirm the saved data is shown correctly.
6. Confirm an empty supplier behaves as empty in the form and is not newly persisted as placeholder text.
7. Copy branch, combined, and category lists; verify one product name per line and no extra fields.
8. Trigger same-branch and cross-branch similar-product flows.
9. Confirm Firebase synchronization and reopen the app to verify persistence.
10. Confirm the visible version matches `version.json` and no feature page has disappeared.

## Workflow regression

### Transfers

- Exercise Branch 1 → Branch 2 and Branch 2 → Branch 1.
- Prepare, edit, and confirm a transfer.
- Check remove/retain decisions, unit conversion where relevant, shortage updates, and history.

### Ordering

- Test empty, single, and multiple suppliers using `/` and `,` with varied spacing.
- Build and confirm an order, including a manual line.
- Confirm a multi-supplier item cannot be ordered twice after one supplier is selected.
- Check supplier grouping, order preview, long names, and deletion confirmation.

### Receiving

- Test partial and full receipt.
- Verify ordered, received/delivered, and history views transition correctly.
- Reopen the app and confirm the result persists and synchronizes.

### Offline/PWA

- Load once online, then verify cached reopening offline.
- Confirm install metadata and icons.
- Simulate a newer `version.json`: verify the prompt appears, **Later** does not reload, and **Update now** applies the new cache/reload flow.

## Data compatibility checks

- Open legacy records missing newer optional fields.
- Check records with an empty supplier and legacy supplier sentinel text.
- Confirm existing Firebase collection names and documents remain readable.
- Use two devices or browser profiles to check live updates and conflicts for shared arrays.

## Reporting results

Record environment, app version, checks performed, pass/fail status, console errors, data created, and any cleanup. Do not state that a workflow is fixed unless the active runtime file was changed and the relevant scenario passed.
