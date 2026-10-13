# TASK-6 — أدلة الفحص

| البند | القيمة |
|---|---|
| الأساس | commit `28ac8052cd76a2966b52d497387487a5afe6c71a` على `claude/wizardly-carson-3b4ute` + تعديلات هذه الجولة |
| البيئة | Linux (حاوية)، Python 3.13.16، PostgreSQL 16.15 (عنقود مؤقت، socket فقط، يُحذف بعد التشغيل)، Docker Compose v5.6.0 (بلا خدمة Docker) |
| الأوامر ورموز الخروج | `evidence/commands.json` (تجزئة كل سجل) — يُعاد إنتاجها بـ`tools/run_all_checks.sh <scratch>` |

## النتائج

| # | الفحص المطلوب | الأداة | النتيجة | الدليل |
|---|---|---|---|---|
| 1 | صياغة YAML/Compose | `docker compose config -q` + CHK-01 | **PASS** (exit 0) | run-compose-config.log، task6-checks.json |
| 2 | لا أسرار حقيقية | CHK-02/02b/02c (+ طفرة CM1) | **PASS** | task6-checks.json، checker-mutation-results.txt |
| 3 | قيود SQL الأساسية | 75 اختبار قاعدة حقيقية + CHK-03/03b | **PASS 75/75** | db-test-results.json، db-tests.log |
| 3b | الاختبارات تكتشف الأعطال (DR-67) | 14 طفرة على المخطط | **14/14 KILLED** | db-mutation-results.txt |
| 4 | العلاقات بين الجداول | CHK-04/04b + FK في الاختبارات (APR-02/14، ISS-05/06) | **PASS** | task6-checks.json |
| 5 | ربط الخدمات بالشبكات | CHK-05/05b (+ CM2) | **PASS** | task6-checks.json |
| 6 | PENDING لم تصبح APPROVED | CHK-06/06b (+ CM3) | **PASS** (9/9 OD PENDING) | task6-checks.json |
| 7 | وجود كل المخرجات | CHK-07، CHK-08 (15 تهديداً) | **PASS** | task6-checks.json |
| 8 | SHA-256 للحزمة | `MANIFEST.sha256` + تجزئة ZIP | **منفذ** | MANIFEST.sha256 |

## ما لم يُنفذ (NOT RUN — ليس PASS)

| البند | السبب |
|---|---|
| `docker compose up` وصحة الحاوية | لا خدمة Docker في بيئة التنفيذ |
| سحب صورة PostgreSQL وفحص ثغراتها | لم تُسحب؛ حُل الـdigest فقط من السجل |
| اختبارات تزامن متعددة الاتصالات (CAS، سلسلة التدقيق، نسخ الثقة) | الاختبارات على اتصال واحد |
| امتيازات عبر اتصالات بكلمات مرور | اختُبرت بـ`SET ROLE` لأدوار NOLOGIN |
| كل ضوابط HTTP/الخدمات (JWT، SSRF، BOLA، TLS، LT-23) | لا خدمات (خارج نطاق TASK-6) |
| تشغيل على Windows | الفحوص على Linux؛ الـworkflow الحالي لا يشغلها بعد |
| الاستعادة من نسخة احتياطية | خارج النطاق |

## الملخص

نجح: 75 اختبار قاعدة + 14 طفرة + 15 فحصاً ساكناً + 4 طفرات فاحص + compose config. فشل: 0. لم يُنفذ: 7 بنود أعلاه.
المراجعة المستقلة: `evidence/independent-review.md`.
