# SWP Business Data

## 1) Backend
ارفع المشروع إلى GitHub ثم أنشئ Web Service على Render من نفس المستودع.
Render سيقرأ render.yaml ويشغل `npm start`.

بعد النشر اختبر:
`https://YOUR-SERVICE.onrender.com/api/health`

## 2) Frontend
افتح `public/index.html` وابحث عن:
`const API_BASE="PUT_YOUR_RENDER_URL_HERE";`

استبدله برابط Render، مثال:
`const API_BASE="https://swp-business-data-api.onrender.com";`

ثم انسخ `public/index.html` إلى جذر مستودع GitHub Pages باسم `index.html`.

## ملاحظة
مصدر الشركات الحالي OpenStreetMap/Overpass مع Backend وCache وRetry وخوادم احتياطية.
لا يمكن ضمان وجود بريد أو هاتف لكل شركة إذا لم تكن البيانات منشورة في المصدر.
