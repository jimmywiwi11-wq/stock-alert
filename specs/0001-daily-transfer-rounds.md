# Specification 0001: Daily Transfer Rounds

- Status: Proposed
- Product: Stock Alert
- Feature: Daily Transfer Rounds
- Document date: 2026-06-23
- Implementation status: Clarification implemented in V7.13; rollover-pending rounds are separated from normal transfer history

## 1. Summary

The transfer workflow must be organized into discrete rounds tied to the shop’s calendar date. Transfer progress shown on the main transfer status page is progress for the current active round only. It must never be calculated from a rolling 24-hour window.

When the calendar date changes, every active round from the previous date must be closed and archived, even if staff prepared only part of it and did not confirm receipt/send completion. The main transfer status card for that direction must then disappear completely. The system must not show an empty 0% card for the new date. This automatically closed, unconfirmed round enters the **“ของที่แบ่งไว้แล้ว”** pending-confirmation queue under its original date.

Pressing **“รับหรือส่งส่วนที่แบ่งก่อน”** during the same day has different meaning from date rollover. It means staff is intentionally taking/sending that prepared batch now. The app must immediately apply the receive/send result to shortage and order-needed data, close the round as confirmed, store it in normal transfer history, remove its main status card, and exclude it from **“ของที่แบ่งไว้แล้ว”**. If staff later transfers more items that day, the next numbered round begins when new work starts.

## 2. Goals

- Make transfer progress represent a calendar-day round rather than accumulated transfer flags.
- Close and archive open rounds when the shop calendar date changes.
- Hide the main status card when no active round exists instead of displaying a synthetic 0% state.
- Preserve intentional partial and completed rounds in normal transfer history.
- Keep only automatically date-closed, unconfirmed rounds in the “ของที่แบ่งไว้แล้ว” pending queue.
- Allow more than one transfer round per direction on the same date.
- Allow staff to confirm receipt/send from an automatically date-closed pending round.
- Update the live shortage and order-needed state safely after confirmation.
- Preserve the existing Branch 1 → Branch 2 and Branch 2 → Branch 1 entry points.
- Remain backward-compatible with existing Firebase records and transfer history.

## 3. Non-goals

- Replacing the existing transfer planning workflow.
- Renaming or deleting existing Firebase collections.
- Deleting old transfer history.
- Automatically deleting confirmed purchase-order history.
- Redesigning unrelated pages or bottom navigation.
- Changing supplier, ordering, receiving, shortage entry, or PWA update behavior except where transfer confirmation must update the live shortage/order-needed result.

## 4. Definitions

### Shop calendar date

The date in the `Asia/Bangkok` timezone, represented internally as `YYYY-MM-DD`, for example `2026-06-23`. The day changes at midnight in that timezone. Device locale formatting must not determine the stored date key.

### Direction

- `1-to-2`: Branch 1 sends to Branch 2; Branch 2 is the shortage/receiving branch.
- `2-to-1`: Branch 2 sends to Branch 1; Branch 1 is the shortage/receiving branch.

### Round

A snapshot of one set of items prepared for one direction. There may be several rounds for the same direction on the same shop date.

### Active round

The round currently shown in main transfer progress and available for further preparation. There can be at most one active round per direction for a given date. A round starts lazily when staff performs the first transfer/preparation action for that direction; merely opening the transfer page or direction page must not create an empty round.

### Archived round

A round removed from main progress and persisted with its item snapshot. Archived rounds have two distinct destinations:

- **Rollover-pending round:** automatically closed because the shop calendar date changed, has `archiveReason: date_rollover`, is not confirmed, and appears in **“ของที่แบ่งไว้แล้ว”**.
- **Normal-history round:** intentionally closed with **“รับหรือส่งส่วนที่แบ่งก่อน”**, fully completed, or later confirmed from the pending queue. It is stored in normal transfer history and does not appear in **“ของที่แบ่งไว้แล้ว”**.

### “ของที่แบ่งไว้แล้ว”

A pending-confirmation work queue, not a complete transfer-history page. It contains only unfinished previous-day rounds that were automatically closed at date rollover and have not yet been confirmed as received/sent.

### Round number

A positive sequence number scoped to one `dateKey` and one direction. The first Branch 1 → Branch 2 round on a date is **รอบที่ 1**, the next round for that same date and direction is **รอบที่ 2**, and so on. The opposite direction has its own sequence for that date. Round numbers are immutable after creation and must not be reused if a round is later deleted from local display or fails confirmation.

### Confirmation

Staff confirmation that a rollover-pending round was physically received/sent. Confirmation is applied to one selected round, records who confirmed it and when, updates shortage/order-needed data, removes the round from the pending queue, and retains it in normal transfer history.

## 5. Functional requirements

### FR-1: Calendar-date closure

1. Main transfer progress must be scoped to the current `Asia/Bangkok` date and current active round.
2. It must not use “last 24 hours” logic.
3. At the first render, sync, focus, or transfer action after midnight, any active round from an earlier date must be closed and archived before new transfer work begins.
4. A closed previous-date round must not contribute to today’s percentage.
5. After closure, the main transfer status card for that direction must disappear completely. It must not remain as a 0% card.
6. No new active round is created merely because the date changed.
7. A new card appears only after staff starts a new transfer round by preparing the first item for that direction.
8. Midnight closure must not require the user to clear browser storage or reload manually.

### FR-2: Preserve previous dates

1. A previous-date active or partial round must be closed and archived with reason `date_rollover`.
2. Its item snapshot must preserve product name, quantity, unit, person who transferred it, direction, preparation time, and confirmation state.
3. Archival must be idempotent: multiple devices or repeated startup reconciliation must not create duplicate rounds.
4. An unconfirmed `date_rollover` round must enter **“ของที่แบ่งไว้แล้ว”** under yesterday’s date and remain there until that specific round is confirmed.
5. The archived round retains its original date and round number; it must not be moved into the new date.
6. Confirmed, completed, and intentionally closed same-day rounds must remain in normal transfer history and must not enter **“ของที่แบ่งไว้แล้ว”**.

### FR-3: Existing transfer entry points

The main Transfer page must retain these existing buttons and their current direction behavior:

- **Branch 1 transfers to Branch 2**
- **Branch 2 transfers to Branch 1**

Their Thai labels may remain as currently implemented. This feature must not remove or relocate them in a way that breaks the familiar workflow.

### FR-4: Rollover-pending entry point

Add a section below the two existing direction buttons titled **“ของที่แบ่งไว้แล้ว”**. Opening this section must show:

- **ของขาดสาขา 1** — pending rollover rounds where Branch 1 is the shortage/receiving branch, normally direction `2-to-1`.
- **ของขาดสาขา 2** — pending rollover rounds where Branch 2 is the shortage/receiving branch, normally direction `1-to-2`.

The branch meaning must be consistent in labels, filtering, and detail pages. It refers to the branch whose shortage the transfer is intended to satisfy, not merely the sending branch.

This section is a pending-confirmation queue, not a complete transfer-history browser. It must include only rounds whose archive reason is `date_rollover` and whose confirmation status is still pending. It must exclude confirmed rounds, normally completed rounds, and rounds closed with `take_partial_now`.

### FR-5: Date list

1. Each branch pending page must group eligible unconfirmed `date_rollover` rounds by `dateKey`.
2. Show each date as a button formatted `DD/MM/YYYY` using the Buddhist year only if that matches the rest of the app; otherwise use the Gregorian year. The implementation must choose one format consistently and document it in tests.
3. Sort dates newest first.
4. A date button may show useful compact metadata such as pending round count and item count, but must remain mobile-friendly.
5. A date must disappear from this pending page when it has no eligible unconfirmed rollover rounds.
6. Within a date, pending rounds must first be separated by branch direction and then by round number.

### FR-6: Date detail

Opening a date must show only eligible unconfirmed rollover rounds relevant to the selected receiving branch on that date. A date page may contain multiple rounds. Group them by branch direction, sort them by immutable `roundNumber`, and show each as a separate button or card labeled **รอบที่ 1**, **รอบที่ 2**, **รอบที่ 3**, and so on.

Selecting a round opens that round’s own detail view. Item rows and confirmation controls must not be combined across rounds.

Each opened round must show only its own transferred items. Each item must show:

- Product name.
- Transferred quantity.
- Unit.
- Who transferred/prepared it.
- Transfer direction.
- Receive/send confirmation status.

The opened round should also show its date, direction, round number, archive reason, preparation/archive time, and confirmation time/person where available.

### FR-7: Confirm receive/send

1. Each unconfirmed rollover-pending round detail must include a **confirm receive/send** button.
2. Confirmation must show a deliberate confirmation dialog before changing live shortage data.
3. The operation must record `confirmedAt` and `confirmedBy` and change the round status to `confirmed`.
4. A confirmed round must leave **“ของที่แบ่งไว้แล้ว”** immediately and remain available in normal transfer history with a confirmed state.
5. The confirmation button must be disabled or hidden after success.
6. Repeated taps, retries, or sync replay must be idempotent and must not subtract or remove shortage twice.
7. An empty nickname must use the existing safe audit fallback without blocking confirmation.
8. Confirmation applies only to the opened round ID and that round’s item lines. It must never confirm, remove, or update items belonging to another round on the same date.
9. The date summary and sibling rounds must update independently. If the selected round was the date’s last pending round, that date must disappear from the pending page.

### FR-8: Shortage and order-needed updates

Confirmation must evaluate each item against the current live shortage record, not blindly overwrite it from the archived snapshot.

The same shortage/order-needed application rules are used when staff intentionally closes a same-day partial batch under FR-9; that path applies them immediately instead of waiting in the pending queue.

- If the transferred amount satisfies the shortage and staff selected the existing “remove/no longer shortage” decision, remove the corresponding live shortage item. It will then naturally leave the derived order-needed list.
- If some shortage remains, keep the item in the receiving branch shortage list and update its remaining quantity/status according to the existing transfer decision and unit-conversion rules.
- If staff explicitly chose to keep the item as shortage, keep it even when the archived transfer quantity is present.
- If the live shortage was edited after the round was archived, show a conflict warning and require staff to review the current value before applying a destructive removal.
- Do not delete or rewrite an already confirmed purchase order merely because a shortage is resolved. “Order-needed list” means the current candidate list derived from shortages, not historical orders already placed.
- Match the live item primarily by stored shortage document ID. Product-name similarity is a fallback for display/recovery and must not silently delete a different record.
- Unit conversion must use the conversion snapshot stored with the round when one exists. If conversion is missing or invalid, require review instead of guessing.

### FR-9: Archive a partial round during the day

Add a button to the main transfer status page:

**“รับหรือส่งส่วนที่แบ่งก่อน”**

Behavior:

1. Show the button when the current direction’s active round contains at least one prepared item and the round is not complete/confirmed.
2. Pressing it opens a confirmation dialog summarizing direction and prepared item count.
3. On confirmation, snapshot only the items prepared in the current active round and apply their receive/send effects to current shortage/order-needed data immediately, using the rules in FR-8.
4. Do not include unprepared candidate items in the archived round.
5. After the shortage/order-needed update succeeds, close the active round as `confirmed`, store it in normal transfer history with reason `take_partial_now`, and record the acting staff member and date/time.
6. Remove its main status card immediately after the full operation succeeds. Do not display a replacement 0% card.
7. Do not place this round in **“ของที่แบ่งไว้แล้ว”**. It is an intentionally completed partial batch and belongs only in normal transfer history.
8. Do not automatically create a replacement round during closure.
9. If staff later prepares another item for the same direction on the same date, create a new active round using the next `roundNumber` for that date and direction, then show its status card.
10. Allow any number of sequential rounds on the same date, while keeping at most one active round per direction at a time.
11. The operation must be idempotent so retries cannot apply the shortage change twice.
12. If either the live-data update or history persistence fails, do not close the round or remove its card; show an error and allow a safe retry.

### FR-10: Progress calculation

For a selected direction and active round:

```text
progress = prepared candidate items in current round / eligible candidate items at round start × 100
```

- Capture the candidate IDs at round creation so unrelated new shortages do not make a partially completed round’s percentage move backward unexpectedly.
- If the current design intentionally uses the live eligible set, that alternative must be approved before implementation and tested for records added or removed mid-round.
- A newly started round calculates from its own prepared work. It may momentarily calculate as 0% during creation, but its status card is created only as part of the first preparation action; the app must not show a waiting 0% card before a round starts.
- An old date’s prepared flags must never increase today’s percentage.
- With no active round, show no main transfer status card for that direction.
- With an active round but no eligible candidates because data changed concurrently, show the existing safe empty/complete presentation rather than an invalid percentage and require reconciliation before archival.

## 6. Affected pages

### Main Transfer page

- Keep both existing direction buttons.
- Add the **“ของที่แบ่งไว้แล้ว”** section below them.

### Main transfer status/direction page

- Calculate progress from current date and active round only.
- Add **“รับหรือส่งส่วนที่แบ่งก่อน”** for a non-empty partial active round.
- Show current date and Thai round label (**รอบที่ 1**, **รอบที่ 2**, and so on) while a round is active.
- Remove the direction’s main status card when its round is closed or archived.
- Do not render an empty 0% status card when no active round exists.

### Rollover-pending branch selector

- New page or modal opened from **“ของที่แบ่งไว้แล้ว”**.
- Contains **ของขาดสาขา 1** and **ของขาดสาขา 2**.

### Pending rollover date list

- One view per receiving/shortage branch.
- Shows only dates containing unconfirmed `date_rollover` rounds, newest first.

### Pending rollover date detail

- Groups eligible pending rounds by branch direction, then lists independently openable **รอบที่ N** entries for the selected branch/date.
- Opening a round shows only that round’s item details.
- Provides confirmation for the specifically opened unconfirmed round only.

### Existing home, shortage, order-needed, and normal transfer history views

- Must re-render correctly after confirmation.
- Existing navigation and normal transfer history must remain available. **“ของที่แบ่งไว้แล้ว”** must not replace or masquerade as that complete history.

## 7. UI flow

### Start or continue today’s round

1. Staff opens Transfer.
2. Staff chooses Branch 1 → Branch 2 or Branch 2 → Branch 1.
3. If an active round exists for today and that direction, the app opens it.
4. If no active round exists, no main status card is shown yet; merely opening the page does not create a round.
5. When staff prepares the first item, the app creates the next numbered round for today and that direction.
6. The status page/card shows today’s date, **รอบที่ N**, and progress for that round only.
7. Staff continues preparing items as in the existing flow.

### Take a partial transfer now

1. Some, but not all, items are prepared.
2. Staff presses **“รับหรือส่งส่วนที่แบ่งก่อน”**.
3. A confirmation dialog shows direction and number of prepared items.
4. The app immediately applies that partial batch to shortage/order-needed data and records who acted and when.
5. The app closes the round as confirmed, preserves its snapshot in normal transfer history, and excludes it from **“ของที่แบ่งไว้แล้ว”**.
6. The closed round’s status card disappears; no replacement 0% card or empty round is created.
7. If staff later prepares another item that day, the app creates **รอบที่ N+1** for the same direction and displays its new status card.

### Browse pending previous-day rounds

1. Staff opens Transfer.
2. Staff opens **“ของที่แบ่งไว้แล้ว”**.
3. Staff chooses **ของขาดสาขา 1** or **ของขาดสาขา 2**.
4. Staff chooses a `DD/MM/YYYY` date.
5. Staff sees only unconfirmed rounds that were automatically closed by date rollover, grouped by transfer direction with separate **รอบที่ N** controls.
6. Staff opens one round to see only that round’s item/status details.

### Confirm an archived round

1. Staff opens one unconfirmed **รอบที่ N** in date detail.
2. Staff reviews items, quantities, units, direction, and current shortage impact.
3. Staff presses confirm receive/send and accepts the confirmation dialog.
4. The app applies only that round ID’s items idempotently to current shortage state.
5. That round becomes confirmed, leaves the pending page, and remains in normal transfer history; sibling pending rounds on the same date remain unchanged.
6. Shortage and order-needed views refresh.

### Date rollover

1. The shop date changes at midnight `Asia/Bangkok`.
2. On the next app activation/render/sync, yesterday’s active round is closed under its original date, direction, and round number and enters **“ของที่แบ่งไว้แล้ว”** as pending confirmation.
3. Its main transfer status card disappears completely.
4. The app does not create today’s round automatically and does not display a 0% card.
5. Yesterday’s unconfirmed rollover round remains accessible and independently confirmable under yesterday’s date until confirmed; it then moves out of the pending queue into normal history.
6. Today’s next round is created only when staff begins new transfer work.

## 8. Firebase and local data impact

### 8.1 Collection strategy

Initial implementation should reuse existing collections:

- `stock_alert_beta1_items` for live shortage records.
- `stock_alert_beta1_transfer_history`, document `main`, for transfer round history.

No existing collection should be renamed, deleted, reset, or have incompatible fields removed.

The current transfer history uses an `items` array in the `main` document. The least disruptive first implementation is to store enriched round objects in that existing array and make readers tolerate both legacy and new round shapes.

### 8.2 Proposed additive round fields

```json
{
  "id": "tr_20260623_1to2_2_<unique>",
  "schemaVersion": 2,
  "dateKey": "2026-06-23",
  "roundNumber": 2,
  "from": 1,
  "to": 2,
  "receivingBranch": 2,
  "status": "archived_pending_confirmation",
  "archiveReason": "date_rollover",
  "candidateItemIds": ["firestore-item-id"],
  "createdAt": 1782147600000,
  "createdBy": "nickname",
  "archivedAt": 1782151200000,
  "archivedBy": "nickname",
  "confirmedAt": null,
  "confirmedBy": "",
  "items": []
}
```

Allowed round statuses:

- `active`
- `archived_pending_confirmation`
- `confirmed`

The tuple `(dateKey, from, to, roundNumber)` must uniquely identify a round sequence entry, while `id` remains the authoritative identity for writes and confirmation. `roundNumber` is allocated independently for each date and direction by taking the next unused positive integer. History readers must group in this order:

1. `dateKey`
2. Direction (`from` → `to`)
3. `roundNumber`

Allowed archive reasons:

- `take_partial_now`
- `date_rollover`
- `completed`
- `legacy_import`

The two user-facing views are derived from these fields:

- **“ของที่แบ่งไว้แล้ว”**: only `archiveReason === "date_rollover"` and `status === "archived_pending_confirmation"`.
- **Normal transfer history**: confirmed rounds and intentionally completed rounds, including `archiveReason === "take_partial_now"`. A same-day intentional partial close must be written as confirmed only after its shortage/order-needed effects have been applied successfully.

No record may appear in both views as pending. Confirmation moves a rollover round from the first logical view to the second without changing its stable round ID.

### 8.3 Proposed additive item snapshot fields

```json
{
  "lineId": "stable-round-line-id",
  "shortageItemId": "firestore-item-id",
  "productKey": "normalized-or-alias-key",
  "name": "Product name",
  "qty": "5",
  "unit": "ตัว",
  "preparedAt": 1782150000000,
  "preparedBy": "nickname",
  "from": 1,
  "to": 2,
  "decision": "remove",
  "confirmationStatus": "pending",
  "appliedAt": null,
  "appliedBy": "",
  "conversion": null
}
```

### 8.4 Additive fields on live shortage items

While an item belongs to an active round, add or reinterpret only additive transfer metadata:

- `transferRoundId`
- `transferDateKey`
- `transferRoundNumber`
- Existing preparation quantity/unit/person/time fields.

Do not remove legacy transfer fields until all deployed clients can read the new schema. Today’s progress must filter by `transferDateKey` and `transferRoundId`, not by the presence of a legacy `transferPrepared` flag alone.

### 8.5 Local fallback

Mirror the enriched rounds under the existing `stockAlertTransferHistory` local-storage key. The same schema, date-key rules, status transitions, and idempotency identifiers must apply offline.

When reconnecting, merging by stable round `id` and line `lineId` is required. Simple concatenation is not acceptable because it can duplicate rounds.

### 8.6 Optional future collection

The existing single-document array can suffer last-write-wins conflicts and document-size growth. If testing shows that safe multi-device updates cannot be achieved with the current shape, propose a separate collection such as `stock_alert_beta1_transfer_rounds`, with one document per round, before creating it. Such a migration requires explicit approval, dual-read compatibility, rollout steps, Firestore rule updates, and rollback instructions. It is not required for the initial implementation unless the concurrency risk cannot be controlled.

## 9. Backward compatibility

- Legacy history entries without `dateKey` should derive it once from `doneAt`, `archivedAt`, or another verified timestamp in `Asia/Bangkok`.
- Do not mutate all legacy records merely to display them; normalize them in the reader where possible.
- Legacy records without a round number display as Round 1 or “Legacy round.”
- Existing confirmed history stays confirmed.
- Legacy or V7.12 `take_partial_now` rounds that are still marked pending must not be displayed in **“ของที่แบ่งไว้แล้ว”** merely because they are unconfirmed. They require a controlled reconciliation that determines whether shortage effects were already applied before marking them confirmed; the app must never guess and double-apply them.
- Legacy `transferPrepared` items without a date require safe reconciliation. If their date cannot be proven, show them in a review state rather than attributing them silently to today.
- New code must continue to read records created by older installed clients during a staged PWA rollout.

## 10. Edge cases

### Date and time

- App remains open across midnight.
- Device clock or timezone differs from `Asia/Bangkok`.
- Device clock changes backward or forward.
- Offline device crosses midnight and reconnects later.
- A round is archived at exactly midnight.

Use one shop-date helper everywhere and use server timestamps where available for audit ordering. Never compare locale-formatted display strings.

### Multiple rounds

- Several partial rounds in the same direction on one date.
- Simultaneous active rounds for opposite directions.
- Archiving with zero prepared items must be blocked.
- A fully prepared but unconfirmed round should be archived and confirmable without being counted in the next round.
- Only automatic date-rollover closure creates an entry in **“ของที่แบ่งไว้แล้ว”**.
- An intentional same-day partial close applies shortage effects immediately and goes directly to normal history.
- Same-day round numbering must remain stable after reload and sync.
- Round numbering is scoped to date plus direction: both directions may have their own **รอบที่ 1** on the same date.
- Closing a round must remove its main status card without pre-creating the next number.
- The next number is allocated only when later transfer work actually begins.

### Confirmation and data changes

- Confirmation button is tapped twice.
- Two devices confirm the same round concurrently.
- Shortage item was edited, deleted, recreated, or moved to a different status after archival.
- Product name changed after archival.
- Quantity is non-numeric, zero, negative, decimal, or contains a unit.
- Transfer unit differs from shortage unit and no conversion exists.
- One line succeeds and another fails. The round must retain per-line applied status and allow safe retry without reapplying successful lines.
- The item was already ordered. Do not delete historical purchase orders automatically.

### History and sync

- Legacy entries lack new fields.
- Firebase is unavailable during archive or confirmation.
- Local and cloud copies contain different updates to the same round.
- The existing `main.items` array approaches Firestore document limits.
- A user opens history while another device archives a round.
- A pending rollover round is confirmed on another device while its date page is open; it must disappear from the pending view without affecting sibling rounds.
- A legacy `take_partial_now` round is pending because an older build archived without applying shortage effects; reconciliation must prevent both omission and double application.

### Candidate-list changes

- A shortage is added after the round starts.
- A candidate is resolved outside the transfer workflow.
- A similar-name alias groups two branch records.
- An item eligible in Round 1 remains eligible in Round 2 after only a partial confirmation.

## 11. Acceptance criteria

1. On the first app activity after `Asia/Bangkok` midnight, each previous-date active round is closed and archived under its original date, direction, and round number.
2. After date rollover, the closed round’s main status card disappears completely; no 0% replacement card or automatic empty round is displayed.
3. An unconfirmed round automatically closed by date rollover is visible under yesterday’s `DD/MM/YYYY` button in **“ของที่แบ่งไว้แล้ว”**.
4. Both existing direction buttons remain usable.
5. **“ของที่แบ่งไว้แล้ว”** appears below the existing direction controls and opens the two branch choices.
6. A date page groups entries by direction and exposes each **รอบที่ N** separately.
7. An opened round detail displays every required item field and confirmation status for that round only.
8. An unconfirmed rollover-pending round can be confirmed exactly once without confirming or changing any sibling round on the same date; afterward it leaves the pending page and remains in normal history.
9. Confirmation removes fulfilled shortages from the live shortage/order-needed candidate lists and preserves remaining shortages.
10. **“รับหรือส่งส่วนที่แบ่งก่อน”** immediately applies only the prepared items to shortage/order-needed data, closes the round as confirmed in normal history, excludes it from **“ของที่แบ่งไว้แล้ว”**, and removes the current status card without automatically starting another round.
11. Later same-day work creates the next numbered round for that date and direction.
12. Multiple same-day rounds appear separately as **รอบที่ 1**, **รอบที่ 2**, **รอบที่ 3**, and so on under the same date and direction.
13. Offline/retry and repeated-click scenarios do not duplicate a round or apply a transfer twice.
14. Legacy Firebase records remain readable.
15. No existing Firebase collection is renamed, deleted, or reset.
16. Confirmed, completed, and intentionally same-day partial-closed rounds never appear in **“ของที่แบ่งไว้แล้ว”**.

## 12. Testing checklist

### Date reset

- [ ] Prepare some items before midnight; cross Bangkok midnight; verify the active round closes and its main status card disappears.
- [ ] Verify no new-day 0% card or empty active round is created automatically.
- [ ] Verify the old partial round is saved under the previous date, original direction, and original round number.
- [ ] Verify the old rollover round appears in **“ของที่แบ่งไว้แล้ว”** only while unconfirmed.
- [ ] Keep the app open through midnight and repeat after background/resume.
- [ ] Repeat with the device configured to a non-Bangkok timezone.
- [ ] Repeat offline, then reconnect and check for duplicate history.
- [ ] Begin new work after rollover and verify the card appears only after the first preparation action.

### Same-day partial rounds

- [ ] Prepare one of several items and press **“รับหรือส่งส่วนที่แบ่งก่อน”**.
- [ ] Cancel the dialog and verify nothing changes.
- [ ] Confirm the action and verify shortage/order-needed data updates immediately and exactly once.
- [ ] Verify the round closes as confirmed in normal history and does not appear in **“ของที่แบ่งไว้แล้ว”**.
- [ ] Verify its status card disappears rather than resetting to 0%.
- [ ] Verify no next round exists until staff starts another transfer action.
- [ ] Create a second and third round on the same date.
- [ ] Verify all rounds appear under one date and direction as **รอบที่ 1**, **รอบที่ 2**, and **รอบที่ 3** with stable numbers.
- [ ] Verify the opposite direction has its own independent round-number sequence.
- [ ] Verify the button is unavailable when no items are prepared.
- [ ] Simulate a persistence failure and verify progress is not cleared.

### Pending rollover navigation

- [ ] Verify both branch buttons filter by receiving/shortage branch correctly.
- [ ] Verify dates use `DD/MM/YYYY` and sort newest first.
- [ ] Verify each date groups entries by direction and provides a separate control for every numbered round.
- [ ] Open each round separately and verify only that round’s items are shown.
- [ ] Verify every detail line shows name, quantity, unit, preparer, direction, and confirmation status.
- [ ] Verify completed, confirmed, and `take_partial_now` rounds are excluded.
- [ ] Confirm the last pending round for a date and verify that date disappears from the pending page.
- [ ] Verify long Thai product names, long units, and long nicknames wrap on mobile.

### Confirmation

- [ ] Confirm a round that fully satisfies a shortage; verify it leaves shortage and order-needed candidates.
- [ ] Confirm a round that only partly satisfies a shortage; verify the correct remainder and unit.
- [ ] Confirm a round whose decision is to keep the shortage.
- [ ] Verify a placed purchase order is not deleted as historical data.
- [ ] Double-tap confirmation and retry after reload; verify the transfer applies once.
- [ ] Confirm one of several rounds on the same date and verify every sibling round and its shortages remain unchanged.
- [ ] Verify the confirmed rollover round leaves the pending page and remains in normal transfer history.
- [ ] Confirm concurrently from two devices; verify one idempotent result.
- [ ] Test a round with one successful and one failed line, then retry.
- [ ] Edit or delete the live shortage before confirmation and verify conflict handling.
- [ ] Test valid, missing, and invalid unit conversions.

### Regression

- [ ] Branch 1 shortage entry works.
- [ ] Branch 2 shortage entry works.
- [ ] Existing item editing works.
- [ ] Existing transfer direction pages still work.
- [ ] Supplier ordering, ordered items, receiving, and delivered history still work.
- [ ] Copy actions still copy names only, one per line.
- [ ] Similar-product prompts and grouping still work.
- [ ] Firebase sync and local fallback still work.
- [ ] PWA installation and controlled update prompt still work.
- [ ] Visible version labels match `version.json` for the eventual release.

## 13. Risks and mitigations

### Whole-array Firebase writes

Risk: `stock_alert_beta1_transfer_history/main` stores an array, so simultaneous devices can overwrite each other.

Mitigation: use stable IDs, merge by ID, compare/update carefully, and run multi-device tests. Escalate to one-document-per-round only through an approved migration if needed.

### Duplicate active rounds or confirmations

Risk: retries and multiple devices may create two rounds or apply shortage changes twice.

Mitigation: deterministic date/direction/round identities where possible, stable line IDs, per-line application markers, idempotent confirmation, and transactional writes where supported.

### Midnight loss

Risk: clearing old preparation fields before persisting a snapshot loses yesterday’s work.

Mitigation: persist/verify the archived round first, then clear or reassign live active-round fields. Never reset on failed archival.

### Legacy-client compatibility

Risk: an older installed PWA may continue writing legacy transfer fields.

Mitigation: additive schema, dual-read normalization, controlled update rollout, and tests with old/new clients. Do not remove legacy fields in the first release.

### Incorrect shortage removal

Risk: archived data may be stale and confirmation could delete a newly edited shortage.

Mitigation: retain the Firestore item ID, compare current data and timestamps, show conflicts, and require review for destructive changes.

### Pending/history misclassification

Risk: completed or intentionally partial-closed rounds could be shown as unfinished previous-day work, or a rollover-pending round could be omitted.

Mitigation: derive **“ของที่แบ่งไว้แล้ว”** from both `archiveReason === "date_rollover"` and pending status. Keep normal history as a separate view and test every status transition.

### Legacy intentional-partial records

Risk: builds before this clarification may contain pending `take_partial_now` rounds whose shortage effects were not applied. Automatically treating them as completed or applying them again could lose or double-count stock changes.

Mitigation: use a one-time, auditable reconciliation based on per-line application markers and current data. Ambiguous records require staff review and remain excluded from the rollover-pending page.

### Timezone inconsistency

Risk: different devices assign one physical round to different dates.

Mitigation: a single `Asia/Bangkok` date helper for storage/grouping and server timestamps for audit ordering.

### History growth

Risk: the transfer-history `main` document may eventually approach Firebase document limits.

Mitigation: monitor serialized size and define an approved per-round collection migration before the limit is near. Never delete history silently.

## 14. Recommended implementation phases

### Phase 1: Discovery and compatibility design

- Trace the final active transfer functions in `index.html`, including later overrides.
- Document current transfer fields, history shape, candidate grouping, unit conversion, and confirmation behavior with fixtures.
- Define the shared Bangkok date helper and legacy normalization rules.
- Decide how stable round and line IDs will be generated.
- Add tests or a repeatable manual fixture before changing behavior.

### Phase 2: Data model and round service

- Add backward-compatible round normalization and serialization.
- Implement active-round resolution by date/direction.
- Implement idempotent archive-before-reset and history merging.
- Keep current UI behavior unchanged while validating old/new data reads.

### Phase 3: Date reset and intentional partial completion

- Scope progress to active round/date.
- Add date-rollover reconciliation.
- Add **“รับหรือส่งส่วนที่แบ่งก่อน”**, immediate idempotent shortage/order-needed application, normal-history persistence, and same-day next-round creation.
- Ensure only `date_rollover` rounds enter the pending-confirmation state.
- Test midnight, offline, retry, and multiple same-day rounds.

### Phase 4: Rollover-pending UI

- Add **“ของที่แบ่งไว้แล้ว”** below existing direction buttons.
- Add branch selection, date grouping, and round/item detail views filtered to unconfirmed `date_rollover` rounds only.
- Keep the existing normal transfer-history experience separate.
- Preserve mobile layout and bottom-navigation clearance.

### Phase 5: Idempotent rollover confirmation

- Add confirm receive/send only to unconfirmed rollover-pending rounds.
- Apply current-shortage comparison, decision rules, unit conversion, per-line status, and conflict handling.
- Refresh shortage and order-needed candidates without deleting purchase-order history.
- Run two-device concurrency tests.
- Reconcile legacy pending `take_partial_now` records safely without placing them in **“ของที่แบ่งไว้แล้ว”**.

### Phase 6: Release hardening

- Run the full project regression checklist.
- Verify legacy records and an older installed client during controlled rollout.
- Update `version.json`, all visible version labels, service-worker cache identifier, and `CHANGELOG.md` for the release.
- Confirm **Update now** and **Later** behavior on an installed PWA.

## 15. Open decisions before implementation

1. Confirm whether displayed years should be Gregorian or Buddhist; storage remains Gregorian `YYYY-MM-DD` either way.
2. Confirm whether one active round per direction is sufficient or whether staff need named concurrent rounds.
3. Confirm the exact staff wording for the receive/send confirmation button and conflict dialog.
4. Confirm whether a fully prepared round auto-archives or requires an explicit action.
5. Confirm how legacy prepared items with no trustworthy preparation date should be surfaced for staff review.
6. Measure current transfer-history document size and multi-device write frequency to decide whether the existing array remains safe.
