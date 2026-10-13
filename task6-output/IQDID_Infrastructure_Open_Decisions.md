# IQDID — القرارات المفتوحة والتعارضات والمصادر الناقصة (TASK-6)

> **لا شيء هنا معتمد.** TASK-6 لا يعتمد OD-01…OD-09 ولا الدفعة أ ولا PD. «المقترح» = توصية للمالك.

## 1. OD-01…OD-09 — أثرها على البنية والقاعدة

| OD | الموضوع | الحالة | ما يجهزه TASK-6 | ما يتوقف على القرار |
|---|---|---|---|---|
| OD-01 | عزل جلسات المؤسسات | **PENDING** | `org_id` + `created_by` ثابتان في الجلسة (DB-VER-08)؛ FK مركب | منشئ فقط أم مشاركة مؤسسية؛ 404/403 في الخدمة |
| OD-02 | JWT والتفويض | **PENDING** | `iam.principal(sub)`، `role_grant`؛ AuthProvider على 9105 | أسماء claims، العمر، الإبطال، مصدر الأدوار |
| OD-03 | Idempotency | **PENDING** | PK بالنطاق الخماسي، ≤24س، تجزئة جسم (DB-IDM-01..03) | التعميم على كل الخدمات؛ التفرد بعد انتهاء الحفظ |
| OD-04 | TTL والاحتفاظ | **PENDING** | `ops.retention_policy` كلها PENDING؛ جلسة ≤120ث | مدد الاحتفاظ؛ سلوك فقد التسليم |
| OD-05 | `status_ref.idx` | **PENDING** | idx مخزن في `issuer.credential`؛ الإسقاط حسب الدور في الخدمة | من يرى idx |
| OD-06 | الموافقة البشرية | **PENDING** | جدول موافقات كامل + `090` (approval إلزامي) غير مطبق | أي عمليات تتطلب موافقة؛ إلزام الحقل في العقد |
| OD-07 | `allowed_response_hosts` | **PENDING** | `response_host` دقيق + `090` (إلزام للمتحقق) غير مطبق | الإلزام + تطبيع المضيف |
| OD-08 | فصل هوية المفاتيح | **PENDING** | `trust_key` بـRFC7638 PK + بصمة شهادة UNIQUE | اعتماد المخطط + سياسة التدوير + إضافة حقل للعقد |
| OD-09 | الإلغاء النهائي والتزامن | **PENDING** | مشغل STA-4091 + CAS (DB-STA-05..09) | شرط CAS في العقد (D-05) |

## 2. التعارضات

### C-1: TrustEntry (OAS v1.1) مقابل `keys` في INT-10 الأصلي
- **الواقع:** `TrustEntry` لا يحوي أي حقل مفاتيح (SC-08 GAP في TASK-4)؛ INT-10 الأصلي ذكر `keys`.
- **الأثر:** المستهلك لا يستطيع ربط مفتاح الحالة/الإصدار بالجهة من القائمة ⇒ T-KEY-01/02، T-STAT-03.
- **المقترح:** إضافة `keys[]: {key_id (RFC7638), cert_sha256, purpose, not_before, not_after}` إلى TrustEntry في v1.2 (لا يعدل TASK-6 OpenAPI). القاعدة جاهزة (`trust.trust_key`).
- **اختبارات:** static check أن TrustEntry يحوي keys؛ رفض قائمة حالة موقعة بمفتاح purpose=credential_signing؛ DB-TRU-01/02.

### C-2: فشل نشر قائمة الحالة مقابل دلالات الاستجابة في OpenAPI
- **الواقع:** ردود 200 في C5 تشترط `list_version` و`published_at`، وفي C3 `status_published_at`؛ بينما 503 (ISS) قد يعني أن الإلغاء لم يُحفظ، وRP-03 تقول إن الإلغاء المخزن لا يُعكس.
- **الأثر:** عميل يتلقى 503 بعد حفظ الإلغاء قد يظن أنه لم يحدث (T-LC-01/07/08).
- **المقترح (D-04):** الإلغاء يُحفظ ذرياً دائماً؛ النشر يُعاد حتى ينجح؛ يُضاف رد `202 Accepted` بـ`{state, list_version, publication: "pending"}` أو `503` بمعرف خطأ يصرح أن الحالة **محفوظة وغير منشورة**. القاعدة تدعم ذلك (`published_version < list_version`).
- **اختبارات:** حقن فشل نشر بعد الحفظ ⇒ الحالة 1 محفوظة + إعادة المحاولة تنشر + لا 1→0؛ مقارنة رد العميل.

### C-3: تجاوز Compatibility Adapter باستدعاء SDK مباشرة
- **الواقع:** TASK3C: الطبقة تحمي F01–F06 فقط عند استعمالها؛ «bypass عبر استدعاء SDK مباشرة ممكن».
- **المقترح:** (1) وحدة واحدة فقط تستورد `@openid4vc/*` و`@sd-jwt/*`؛ (2) قاعدة lint/فحص ساكن في CI يرفض أي import لهذه الحزم خارج مجلد الطبقة؛ (3) اختبار تكامل لكل نقطة SDK يثبت مرور الطلب بالحارس.
- **اختبارات:** grep/ESLint `no-restricted-imports` + اختبار طفرة يضيف import مباشر فيفشل CI.

## 3. قرارات بنية جديدة يقترحها TASK-6 (غير معتمدة)

| ID | القرار | المقترح |
|---|---|---|
| IN-01 | محرك القاعدة | PostgreSQL 16 (مثبت الإصدار) |
| IN-02 | تشغيل محلي | الخيار A (Node على Windows + PG محلي) افتراضياً؛ Compose اختياري |
| IN-03 | إنهاء TLS | داخل الخدمة + proxy SNI (يتبع DR-06) |
| IN-04 | أداة الهجرات | SQL مرقمة؛ الأداة غير مختارة (لا تغيير تبعيات) |
| IN-05 | digest الصور | إلزامي؛ مثبت لـPostgreSQL (`16.15-alpine@sha256:721873c3…`)؛ سياسة التحديث وفحص الثغرات PENDING |
| IN-06 | فصل `status-writer` عن `status-allocator` | D-06 |

## 4. المصادر

| المصدر | الحالة |
|---|---|
| Implementation_Baseline_v1.0 | مقروء (مرفق + فرع task3) |
| Phase_2_Consolidated_Architecture_v1.1 | **MISSING** كاملاً؛ المتاح فقط `Recovered_Architecture_Sections_v1.1.md` (الفصل 6 والفصل 14، غير معتمد) |
| Phase_2_Enhanced_Architecture_v1.2 | مقروء (فرع task3 `docs/task3/sources`) |
| Decision_Register_v1.0 | **MISSING** كملف مستقل؛ استُعمل الفصل 14 المستعاد وG1_Decision_Recommendations_v1.0 |
| OpenAPI v1.1 (4 ملفات) | مقروء — `openapi/v1.1/*` على task3، `1.1.0-draft` |
| TASK3C_Remediation_Report.md | مقروء |
| TASK4_Threat_Model_Final_Report + السجلات | مقروء (الحزمة المرفقة)؛ **TASK-4B: MISSING** (لا نتائج متاحة) |
| TASK5_Test_Strategy_Report | مقروء (الحزمة المرفقة) |
| التقرير القانوني §9، الحوكمة §18 | MISSING — مدد الاحتفاظ تبقى مقترحة |
