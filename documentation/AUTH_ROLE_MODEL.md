# Auth Role Model

## Current Model

- Firebase Anonymous Auth is used.
- `uid` exists through `auth.currentUser.uid`.
- `nickname` is localStorage/device text.
- `branch` is localStorage/device selection.
- No production `users/{uid}` provisioning is active in the repo.

## Risk

- Anonymous uid changes when browser/device state changes.
- Nickname and branch can be edited by the client.
- Local CMS permission flags are not security boundaries.
- A user can claim another branch if rules trust client branch text.

## Proposed Model

Collection: `users/{uid}`

```json
{
  "uid": "employee-branch-1",
  "nickname": "Staff",
  "branch": "สาขา 1",
  "role": "employee",
  "permissions": ["invoice-request:create", "product:create"],
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Roles:

- `employee`
- `manager`
- `admin`
- `owner`
- `system`

## Migration Plan

1. Keep anonymous login for now.
2. Provision `users/{uid}` documents for approved devices/users.
3. Rules trust `users/{uid}`, not localStorage.
4. Later evaluate Google login, email login, PIN login, or admin provisioning UI.

Phase 5.1.5 does not change login behavior.
