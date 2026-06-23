# AGENTS.md — Stock Alert Project Instructions

## Project overview

This project is a mobile-first PWA called Stock Alert for Chokanan Hardware.
It is used by real staff in a real shop to record missing/low-stock items, manage shortage lists for Branch 1 and Branch 2, handle transfer planning, supplier ordering, received goods, and app updates.

## Very important rules

* Do not remove existing features.
* Do not rewrite the whole app unless explicitly requested.
* Modify only the files and functions needed for the requested task.
* Keep all current UI and workflows working unless the user specifically asks to change them.
* Before changing code, search the project to find the real function/component being used.
* Do not guess which file controls the UI.
* Avoid replacing large blocks of code if a small targeted fix is enough.
* After making changes, explain exactly which files were changed and why.
* Always preserve Firebase data compatibility.
* Never reset, delete, or rename existing Firebase collections unless explicitly requested.
* Never break installed PWA behavior.
* Do not change the Netlify/GitHub deployment setup unless explicitly requested.

## Versioning rules

* Every release must update version.json.
* Every visible version label in the app must match version.json.
* Do not auto-update users silently.
* The app should show an update prompt first:

  * Update now
  * Later
* Only after the user presses Update now should the app clear cache/reload to the new version.

## Current app behavior to preserve

The app currently supports:

* Branch 1 shortage entry
* Branch 2 shortage entry
* Combined shortage list
* Category-based shortage list
* Transfer planner between branches
* Supplier ordering
* Ordered items page
* Received items page
* Firebase sync
* Device/user nickname
* PWA install
* Version checking and update flow
* Copy shortage lists
* Product similarity checking
* Category filtering
* Shortage status: out of stock / low stock
* Supplier names, including multiple suppliers separated by / or ,

## Copy list behavior

When adding or editing copy buttons:

* Copy only product names unless explicitly requested otherwise.
* One product per line.
* No branch name.
* No quantity.
* No unit.
* No status.
* No extra details.

Example output:
Product A
Product B
Product C

## Supplier behavior

Supplier field is optional.
If no supplier is set, it must behave like an empty value with placeholder text, not real text.
Do not store “ยังไม่ได้ระบุ” as actual supplier text unless explicitly requested.
Multiple suppliers may be typed with separators such as:

* SCG / TOA
* SCG/TOA
* SCG, TOA
* SCG,TOA

Spacing around separators should not matter.

If an item can be ordered from multiple suppliers and the user confirms ordering it from one supplier, the item should not remain available to be ordered again from the other suppliers.

## Similar product behavior

The app should detect similar product names, not only exact matches.
If the same branch enters a similar item that already exists, ask:
“ใช่สินค้าเดียวกันหรือไม่?”

If yes:

* Show that this item already exists in the shortage list.
* Offer buttons:

  * OK
  * Edit
    If Edit is selected, open the existing item edit screen.

If another branch enters a similar item already recorded in the other branch:

* Ask whether it is the same product.
* If yes, allow saving and treat it as the same product for grouping, ordering, and transfer logic.
* Do not require exact spelling.

## Quantity and unit input

When a user types quantity and unit together, split them automatically.

Examples:

* 5ตัว → quantity = 5, unit = ตัว
* 5ต → quantity = 5, unit = ต
* 10ถุง → quantity = 10, unit = ถุง

This should work in both Branch 1 and Branch 2 shortage entry forms.

## UI rules

* Keep the UI mobile-first.
* Do not make buttons unnecessarily large.
* Copy buttons should be small and placed near “รายละเอียด” or the related section title unless requested otherwise.
* Do not change the whole design unless explicitly requested.
* Bottom navigation must remain usable and not block important buttons.

## Testing checklist after every change

After every code change, verify:

* App opens without JavaScript errors.
* Branch 1 entry works.
* Branch 2 entry works.
* Editing an existing item works.
* Supplier placeholder is not saved as real text.
* Copy buttons copy one product per line.
* Similar product warning still works.
* Firebase sync still works.
* Version display is correct.
* PWA update prompt still works.
* Existing pages are not missing features.

## Communication style

When reporting back:

* Explain what changed.
* List modified files.
* Mention anything risky.
* Do not claim something is fixed unless it was actually changed in the real file used by the app.
