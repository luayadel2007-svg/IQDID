# تشغيل TASK3B الفعلي

الأدلة النهائية: evidence/task3/20261012T230434Z-c86e748c. commands.json يسجل UTC الفعلي 2026-10-12T23:04:39Z (02:04 بغداد 13 أكتوبر)، Node v24.19.0، npm11.9.0، Python، argv ورموز الخروج وstdout/stderr. Node المحلي يختلف عن أساس22، دون ترقية أساس التشغيل. أدوات validation/lint مثبتة في scratch بعقدي package-lock TASK3 الموجودين، وP04 من package-lock G1 دون تعديل المجمد. لا خدمات/HTTP/تخزين.

| الفحص | النتيجة | الخروج | الحد |
|---|---|---|---|
| contracts | 56/56 | 0 | static/model only |
| engineering | 56/56 | 0 | static/model only |
| policy-model | 16/16 | 0 | static/model only |
| p04-structure | 18/18 | 0 | PARTIAL P04 scope only |
| YAML strict + Swagger validate/dereference | 4/4 | 0 | parsing/schema فقط |
| Spectral6.15.0 | 0errors/4warnings | 0 | info-contact غير معتمد |
| Redocly2.5.0 | 0errors/5warnings | 0 | 4license + 1payload usage |
| TASK2 scanner في Index snapshot مستقل | 153file/0findings | 0 | الفاحص الموجود، لا تاريخ Git كامل |
| frozen G1 | 18/18 | 0 | raw Git blob + SHA256 |
| existing evidence directory refusal | رفض متوقع، لا overwrite | 1 | اختبار سلبي للمشغّل |

أوامر إعادة التشغيل: npm ci --prefix <toolroot> --ignore-scripts من tests/contracts/task3/package-lock.json؛ تثبيت Spectral مستقل من spectral-tool/package-lock.json؛ تثبيت P04 في scratch من lock G1؛ TASK3_TOOL_ROOT وTASK3_SPECTRAL_ROOT وTASK3_P04_ROOT ثم python tests/contracts/task3/run-validation.py. runner ينشئ دليل UTC/UUID جديداً، ويمكن TASK3_EVIDENCE_DIR بشرط أن يكون مساراً جديداً تحت evidence/task3. لا تشغيل inside frozen folder ولا npm install داخلها.

حالات الرفض الإلزامية: M01 root unexpected، M02 duplicate YAML، N03 response body، M04 missing401، M05 unknown schema key، M06 idx metadata، N07/N08 missing/wrong request، M09 role، OD01 foreign org/owner oracle، M11/M12 reason drift/duplicate، OD03 collision/inflight oracle، OD06 approval clone، OD07 host clone/normalization، RP01 reuse certificate key identity، RP03 1→0/2، M18 unsafe example، M19 public downgrade وM20 anonymous OR. 56 الهندسية تتضمن positive and negative؛ ليست 56 خدمات. العقود السابقة56 وRP16 أعيد تنفيذها ولم تنسب نتائج قديمة إلى تشغيل جديد.

قيود mutation: guard يفحص baseline أولاً؛ كامل docs مشتق ومنسوخ لكل طفرة، مع مطابقة سبب رفض مقصود. AJV checks body values، Swagger unresolved ref negative، YAML duplicate negative. P04 independent digest membership ليس full RFC graph verifier، ولا issuer/KB signature؛ لا ينفذ network discovery/trust/time. P04 = PARTIAL رغم18/18 في النطاق الضيق.

الأخطاء أثناء التطوير محفوظة أيضاً: engineering-precheck الأول53/54 بسبب اسم operationId خاطئ في جدول test، ثم corrected؛ P04 أول17/18 بسبب traversal ترتيب nested disclosure غير مناسب، عولج بجمع digests قبل membership. المراجعة المستقلة اكتشفت auth-removal mutation وكانت مقبولة في نسخة guard أولية؛ أضيف رفض public/anonymous البدائل وأسباب محددة، ثم إعادة التشغيل النهائي56/56. هذه إخفاقات harness حقيقية وليست نتائج إنتاج أو نجاحات معاد تصنيفها.

TASK2 scanner استُخدم من شجرة TASK2 المثبتة150084192b1a6d3f68eed0f56d5c0e5b1248df30؛ rules أضيفت إلى Git Index مؤقت خارج TASK3، فلا تعديل .security أو tools أو Index المشروع. فحص153 يمثل snapshot عند التشغيل، قبل إضافة التقارير النهائية؛ يعاد staged-only بعد تجهيز التسليم. لا نتائج GitHub Actions خاصة بـTASK3B ادُعيت: لا workflow أضيف أو عُدّل لأن النطاق يمنعه. الاختبارات هنا Linux محلية، Windows السابق TASK1/2 أدلة سابقة فقط.
