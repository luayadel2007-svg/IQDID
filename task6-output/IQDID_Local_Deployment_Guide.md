# IQDID — دليل التشغيل المحلي (TASK-6)

> TEST ONLY. **لا توجد خدمات هوية مبنية.** هذا الدليل يجهز البنية فقط (قاعدة البيانات، الأسماء، TLS). خطوات الخدمات «مستقبلية» حتى اجتياز G1a وقرار البناء.

## 1. حدود PoC

- حاسوب واحد، مستخدم واحد، بيانات وهمية. لا عرض خارجي، لا هاتف حقيقي (G1b).
- Compose = راحة تطوير، **ليس** حداً أمنياً. لا تعطيل TLS، ولا منافذ قاعدة منشورة.
- لا شيء هنا يعلن G1a أو G1b.

## 2. المتطلبات (Windows)

Windows 11، PowerShell 7، Node.js 22 LTS، Git مع `core.autocrlf=false` (`.gitattributes` موجود في الفروع السابقة)، وأحد:
- **A:** PostgreSQL 16 مثبت محلياً، `listen_addresses='localhost'`.
- **B (اختياري):** Docker Desktop + WSL2.

## 3. الخطوات — الخيار A (PostgreSQL محلي)

```powershell
# 1) اختبار المخطط على عنقود مؤقت (Linux/WSL أو CI):
bash task6-output/tools/run_db_tests.sh task6-output/evidence
bash task6-output/tools/run_db_mutations.sh $env:TEMP\iqdid-mut task6-output/evidence/db-mutation-results.txt
# 2) قاعدة تطوير (مدير PG):
createdb -h localhost iqdid_dev
psql -h localhost -d iqdid_dev -v ON_ERROR_STOP=1 -f task6-output/sql/001_schema.sql
# لا تطبق 090_pending_proposals.sql قبل اعتماد OD-06/OD-07.
```

## 4. الخطوات — الخيار B (Compose، قاعدة فقط)

```powershell
cd task6-output
Copy-Item .env.example .env          # الصورة مثبتة بـdigest مسبقاً
New-Item -ItemType Directory secrets | Out-Null
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b) | Set-Content -NoNewline secrets\db_bootstrap_password.txt
docker compose config -q             # تحقق الصياغة
docker compose up -d db
docker compose --profile check run --rm db-migrate-check   # يعرض المخططات
docker compose down                   # down -v يحذف البيانات
```

القاعدة غير منشورة للمضيف؛ الوصول من حاوية على شبكة `data` فقط.

## 5. الأسماء وTLS (تحضير مستقبلي)

1. hosts (مدير مرة واحدة): `127.0.0.1 issuer.digital-id.test status.digital-id.test trust.digital-id.test verifier.digital-id.test auth.digital-id.test`
2. TLS-CA TEST منفصلة على وسيط غير متصل؛ شهادة لكل اسم، ≤90 يوماً.
3. لا تثبت TLS-CA في مخزن Windows الجذري؛ استعمل `NODE_EXTRA_CA_CERTS` للعمليات المعنية.

## 6. الخدمات (مستقبلي — بعد G1a)

| الخدمة | المنفذ | دور DB |
|---|---|---|
| C3 | 9101 | svc_issuer |
| C4 | 9102 | svc_trust |
| C5 | 9103 | svc_status |
| C2-B | 9104 | svc_verifier |
| AuthProvider | 9105 | — |
| proxy SNI | 8443 | — |

كل خدمة: `IQDID_ENVIRONMENT=TEST`، ملف سر لدورها، مفاتيح توقيعها المشفرة، ربط على `127.0.0.1` فقط.

## 7. استكشاف الأخطاء

| العرض | السبب المرجح |
|---|---|
| `runuser: … Permission denied` في `run_db_tests.sh` | مسار ثنائيات PostgreSQL أو صلاحيات المجلد المؤقت |
| `IQDID_DB_IMAGE` غير معرف | لم يُنسخ `.env.example` إلى `.env` |
| فشل `db-migrate-check` بالمصادقة | ملف السر به سطر جديد — استعمل `-NoNewline` |
