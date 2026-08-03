# Features and Preserved Workflows

## Shortage entry

- Staff can create shortage records for Branch 1 or Branch 2.
- A record can be out of stock or low stock.
- Low-stock records accept quantity and unit; combined input such as `5ตัว` should split into quantity `5` and unit `ตัว`.
- Records include product name, category, optional supplier, note, branch, creator/editor, and timestamps.
- Existing records can be edited or deleted through the detailed list workflow.

## Shortage views

- Separate Branch 1 and Branch 2 lists.
- Combined list grouped across branches.
- Category list and category detail view.
- Search and category filtering.
- Compact and detailed list presentations.
- Copy actions output product names only, one per line, without branch, quantity, unit, status, or other details.

## Similar products

- Product matching includes normalized and approximate names, not only exact spelling.
- A similar item in the same branch prompts staff to confirm whether it is the same product; confirmation exposes the existing record and an edit path.
- A similar item in the other branch may be saved as the same product and must group consistently in downstream transfer and ordering logic.

## Transfers

- The app identifies branch-to-branch transfer opportunities.
- Staff can prepare quantities, monitor status, confirm receipt/transfer, and retain transfer history.
- Transfer completion may remove a shortage or update its remaining quantity according to the selected decision.
- Unit conversion support exists in later compatibility logic and must be regression-tested when transfer code changes.

## Supplier ordering and receiving

- Supplier is optional and may contain multiple suppliers separated by `/` or `,`, with or without surrounding spaces.
- Staff can build purchase orders, add manual lines, preview an order, and group ordered items by supplier.
- Ordered goods can be partially or fully received.
- Delivered items and delivery history remain available.
- Once an item is confirmed for one supplier, it must not remain available for duplicate ordering through another supplier option.

## Supporting capabilities

- Firebase synchronization with a local/offline fallback.
- Device/user nickname.
- Activity history.
- Category and supplier management.
- PWA installation.
- Version checking and a user-controlled update prompt.
- Home summary, search, and status indicators.

## Feature-change rule

Before changing a feature, trace its active markup, final function override, persisted data, adjacent screens, and offline behavior. A screen appearing to work is not enough if its data grouping or Firebase writes have changed.
