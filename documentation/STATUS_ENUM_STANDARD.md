# Status Enum Standard

## Invoice Request

| Status | Meaning | Who may set |
| --- | --- | --- |
| `กำลังดำเนินการ` | Submitted request waiting for invoice workflow | Employee on create |
| `สร้างใบกำกับแล้ว` | Backend/admin generated invoice ids | Admin/owner/backend |
| `พร้อมพิมพ์` | Invoice generated and ready to print | Admin/owner/backend |
| `พิมพ์แล้ว` | Printed or print count updated | Admin/owner/backend |
| `ยกเลิก` | Cancelled request | Admin/owner/backend |

## Generation State

| State | Meaning |
| --- | --- |
| `not-started` | Phase 5.1 request only; no invoice generated |
| `generated` | Future phase only |
| `failed` | Future backend error |

## Stock Alert Shortage

| Status | Meaning |
| --- | --- |
| `out` | Out of stock |
| `low` | Low stock with remaining quantity |

## Transfer

Use booleans and future enums carefully:

- `transferPrepared`
- `transferDone`
- `transferStatus`
- `splitStatus`

Do not overload Thai display text as a hidden state unless documented here.
