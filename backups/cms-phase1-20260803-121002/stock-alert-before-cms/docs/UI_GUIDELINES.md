# UI Guidelines

## Product principles

- Design for phones first and for staff using the app quickly in a real shop.
- Preserve familiar labels, screen order, and workflows unless a change is explicitly requested.
- Prefer a small local adjustment over a full-page redesign.
- Keep primary actions clear without making every control oversized.

## Layout and navigation

- Keep bottom navigation reachable, visually stable, and clear of important buttons or form fields.
- Account for mobile safe areas and the on-screen keyboard.
- Keep content readable at narrow widths without horizontal scrolling.
- Preserve existing page and modal behavior when adding controls.

## Buttons and actions

- Use a clear visual distinction for primary, secondary, destructive, and confirmation actions.
- Copy buttons should be compact and placed near “รายละเอียด” or the relevant section title.
- A copy action must copy product names only, one name per line.
- Destructive actions must remain deliberate and require confirmation where the current workflow expects it.
- Touch targets should be usable without creating visually dominant oversized buttons.

## Forms

- Keep Branch 1 and Branch 2 forms behaviorally consistent.
- Supplier is optional. Show placeholder text for an empty supplier; do not present placeholder text as user-entered data.
- Accept quantity and unit together and split them without losing either value.
- Preserve Thai input, composition events, cursor/focus behavior, and keyboard usability.
- Validation should explain what is missing and preserve entered values.

## Feedback and dialogs

- Use concise Thai feedback consistent with the current app.
- Similar-product prompts must make the compared product and branch clear.
- Update dialogs must offer **Update now** and **Later**. Never silently reload into a new release.
- Loading, offline, sync, success, and error states should be distinguishable without relying only on color.

## Accessibility baseline

- Maintain readable contrast and text size.
- Give icon-only controls an accessible name.
- Keep focus visible and return it sensibly after dialogs.
- Do not encode status through color alone.
- Test zoom, long product names, long supplier names, and Thai text wrapping.
