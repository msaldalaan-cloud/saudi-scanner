# Saudi Scanner Pro — دليل الرفع على Vercel

## الملفات
```
saudi-scanner/
├── index.html       ← البرنامج الكامل
├── api/
│   └── sahmk.js    ← Proxy للـ API (يخفي المفتاح)
└── vercel.json      ← إعدادات Vercel
```

---

## خطوات الرفع (5 دقائق)

### 1. حمّل الملفات
- حمّل المجلد `saudi-scanner` كاملاً

### 2. أنشئ حساب Vercel
- اذهب إلى https://vercel.com
- سجّل دخول بـ GitHub أو Google

### 3. ارفع المشروع
**طريقة A — رفع مباشر (الأسهل):**
1. افتح https://vercel.com/new
2. اختر "Browse" وارفع مجلد `saudi-scanner`
3. اضغط Deploy

**طريقة B — عبر GitHub:**
1. أنشئ repo جديد على GitHub
2. ارفع الملفات الثلاثة
3. في Vercel اختر "Import Git Repository"

### 4. أضف API Key (مهم جداً)
بعد الـ Deploy:
1. افتح مشروعك في Vercel Dashboard
2. اذهب إلى **Settings → Environment Variables**
3. أضف:
   - **Name:** `SAHMK_API_KEY`
   - **Value:** `shmk_test_9f22d8b3be3e56f97677aa46cddd4032453684920106f36c`
4. اضغط **Save**
5. اضغط **Redeploy** (مهم حتى يأخذ المتغير)

### 5. افتح البرنامج
- Vercel يعطيك رابط مثل: `https://saudi-scanner-xxx.vercel.app`
- افتحه من أي جهاز أو جوال

---

## عدد الطلبات

| الإطارات المختارة | طلبات لكل فحص |
|---|---|
| إطار واحد (مثلاً يومي فقط) | ~134 طلب |
| إطارين (أسبوعي + يومي) | ~268 طلب |
| ثلاثة إطارات | ~402 طلب |

الـ Proxy عنده Cache 5 دقائق — إذا فحصت مرتين بـ 5 دقائق لا يُكرر الطلبات.

---

## Environment Variables — أضفها في Vercel

| المتغير | القيمة | مطلوب |
|---|---|---|
| `SAHMK_API_KEY` | مفتاح sahmk.sa | ✅ |
| `ALERT_EMAIL` | إيميلك للتنبيهات | ✅ |
| `EMAILJS_PUBLIC_KEY` | من emailjs.com | ✅ للإيميل |
| `EMAILJS_SERVICE_ID` | من emailjs.com | ✅ للإيميل |
| `EMAILJS_TEMPLATE_ID` | من emailjs.com | ✅ للإيميل |
| `CRON_SECRET` | أي كلمة سر تختارها | اختياري |

**مكان الإضافة:** Vercel Dashboard → مشروعك → Settings → Environment Variables


1. اذهب إلى https://emailjs.com وأنشئ حساب مجاني
2. أنشئ **Email Service** (Gmail أو Outlook)
3. أنشئ **Email Template** بالمتغيرات التالية:
   ```
   To: {{to_email}}
   Subject: تنبيه سكانر — {{strategy_name}}
   
   الاستراتيجية: {{strategy_name}}
   التاريخ: {{scan_date}} الساعة {{scan_time}}
   عدد الإشارات: {{total_signals}}
   
   الأسهم:
   {{stocks_list}}
   ```
4. في البرنامج (أسفل الصفحة) اضغط "تعديل" بجانب Service ID
5. أدخل: Public Key + Service ID + Template ID
