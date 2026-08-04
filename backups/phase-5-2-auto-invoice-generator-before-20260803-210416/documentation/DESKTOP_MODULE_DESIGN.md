# Desktop Module Design

## เป้าหมาย

เพิ่มปุ่ม “ใบกำกับภาษี” สำหรับ Desktop เท่านั้นใน Stock Alert โดยไม่กระทบ mobile workflow และไม่เปลี่ยน Tax Invoice UI/print layout เดิม

## Desktop-only Detection

ห้ามใช้ user agent อย่างเดียว ควรใช้หลายเงื่อนไขร่วมกัน:

- viewport width เช่น `min-width >= 900px`
- pointer: `fine`
- hover: `hover`
- device memory/CPU เป็น signal รอง ถ้ามี
- permission/role ของผู้ใช้
- feature flag เช่น `cms.taxInvoice.enabled`

ตัวอย่าง policy:

```text
canShowTaxInvoiceButton =
  viewport >= 900
  AND pointer fine
  AND hover available
  AND permission taxInvoice.view
  AND feature flag enabled
```

Mobile direct URL ต้องถูก route guard และแสดงข้อความว่าใช้งานได้เฉพาะคอมพิวเตอร์

## Button Placement

Phase 3 ควรเพิ่มปุ่มเฉพาะ desktop shell หรือ desktop home area ไม่ควรเพิ่มใน bottom navigation mobile

ปุ่มควร:

- แสดงเฉพาะ desktop
- เปิด route/module Tax Invoice
- มีปุ่มกลับ Stock Alert
- ไม่ติดไปใน print

## Authorization

สิทธิ์ที่ต้องออกแบบ:

- `taxInvoice.view`
- `taxInvoice.create`
- `taxInvoice.edit`
- `taxInvoice.print`
- `taxInvoice.history`
- `taxInvoice.settings`
- `taxInvoice.layout`
- `taxInvoice.delete`

ระบบผู้ใช้เดิมมีเพียง nickname + anonymous auth จึงยังไม่พอสำหรับ security จริง

ข้อเสนอ:

- Phase 3 test: ใช้ local permission config/test users
- Phase production: เพิ่ม user/role document เช่น `users/{uid}` หรือ `cmsUsers/{uid}`
- Desktop detection เป็น UX guard เท่านั้น ไม่ใช่ security guard

## Integration Options

| Option | Description | เหมือนเดิม | Risk | Data Sharing | Printing | Maintenance |
| --- | --- | --- | --- | --- | --- | --- |
| A | เปิด Tax Invoice เป็น standalone page ใน repo | สูงมาก | ต่ำ | ต่ำ/ผ่าน adapter ภายหลัง | ปลอดภัยสุด | ง่าย |
| B | ฝังผ่าน iframe และแชร์ข้อมูลผ่าน service/API | สูง | กลาง | กลาง/ดี | ปลอดภัยถ้า iframe แยก print | กลาง |
| C | แปลง Tax Invoice เป็น component/module โดยตรง | ต่ำ-กลาง | สูงมาก | สูง | เสี่ยง CSS/print มาก | ยาก |

## Recommendation

แนะนำ Option B แบบค่อยเป็นค่อยไป:

1. เริ่มจาก standalone/isolated document context
2. เปิดผ่าน desktop-only shell
3. ใช้ iframe หรือ separate page เพื่อกัน CSS/print
4. แชร์ข้อมูลผ่าน adapter/API แยก ไม่ให้ Tax Invoice แตะ Stock Alert globals โดยตรง
5. เริ่ม read-only shared products ก่อน แล้วค่อย write ใน test environment

ถ้าต้องเร็วและปลอดภัยที่สุดในรอบแรก ให้เริ่ม Option A แล้วค่อยขยับเป็น B

## CSS และ Print Isolation

ความเสี่ยงเมื่อฝังเข้า app shell:

- CSS ของ Stock Alert ทับ invoice table/input/body
- global font ทับ font สำหรับพิมพ์
- `@media print` ของทั้งสองระบบชนกัน
- header/nav/sidebar ติดไปในกระดาษ
- service worker cache relative assets ผิด path
- scaling/margin ทำให้ 9x11 และ 9x5.5 เพี้ยน
- layout coordinates mm เพี้ยน
- overlay/background ถูกซ่อน

เปรียบเทียบวิธีแยก styles:

| วิธี | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| Scoped CSS | ทำในหน้าเดียวได้ | เสี่ยงหลุดเพราะ app เดิมมี global CSS มาก |
| Shadow DOM | กัน style ได้บางส่วน | print และ global body/page ยังซับซ้อน |
| iframe | กัน CSS/JS/global ได้ดี | ต้องออกแบบ data bridge |
| isolated route/page | ง่ายและปลอดภัย | app shell integration น้อย |
| separate document context | ปลอดภัยสุดสำหรับ print | ต้องมี navigation กลับ |

แนวทางที่ปลอดภัยสุด: iframe หรือ isolated route ที่ใช้ document context แยก และตอน print ให้พิมพ์เฉพาะ Tax Invoice context

## Route Guard

Route Tax Invoice ควรตรวจ:

- desktop capability
- permission
- feature flag
- online requirement เฉพาะกรณีออกเลขบิลจริง

Mobile should show:

```text
ใบกำกับภาษีใช้งานได้เฉพาะคอมพิวเตอร์
ระบบของขาดยังใช้งานได้ตามปกติ
```

## Phase 3 Implementation Shape

ห้ามเริ่ม implementation จนกว่าจะอนุมัติ

เมื่อต้องเริ่มจริง ควรเพิ่มเฉพาะ:

- desktop shell wrapper
- route guard
- isolated link/iframe to `desktop/tax-invoice/tax_invoice_app.html`
- adapter interfaces แบบ read-only
