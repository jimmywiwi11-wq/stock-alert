คืนหน้าแอปพนักงานรุ่นล่าสุด โดยไม่แตะโปรแกรมใบกำกับภาษี

1. แตก ZIP แล้วนำเฉพาะโฟลเดอร์ modules ไปวางทับในโฟลเดอร์หลัก stock-alert
   ไฟล์ที่จะถูกแทนที่มีเพียง:
   modules/invoice-request/invoice-request.js
   modules/invoice-request/invoice-request.css

2. วางไฟล์ refresh_employee_app_cache_once.html ไว้ระดับเดียวกับ index.html

3. ห้ามนำโฟลเดอร์ desktop จากชุดอื่นมาวางทับ โปรแกรมใบกำกับภาษีที่เปิดได้แล้วต้องคงเดิม

4. เปิดระบบจากไอคอน ChokAnan Management System ให้ URL เป็น 127.0.0.1:8765

5. เปิด URL นี้หนึ่งครั้ง:
   http://127.0.0.1:8765/refresh_employee_app_cache_once.html

6. กด “ล้างแคชและเปิดแอปรุ่นล่าสุด”
   การทำงานนี้ล้างเฉพาะ Service Worker/Cache Storage ไม่ลบสินค้า ลูกค้า localStorage IndexedDB หรือ Firestore

รุ่นนี้มี:
- เมนู ⋮ ในหน้าสถานะใบกำกับภาษี
- ล้างสถานะทั้งหมด/เลือกบางรายการ
- ล้างสถานะและประวัติบนมือถือแบบยืนยันหลายชั้น
- รายการสินค้าแบบกะทัดรัด
- เพิ่มบริษัทลูกค้าใหม่และซิงก์ฐานกลาง
