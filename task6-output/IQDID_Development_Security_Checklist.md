# IQDID — قائمة ضوابط التطوير الآمن وربطها بالتهديدات (TASK-6)

> TEST ONLY. **«مصمم» لا يعني «مطبق».** الحالات: `DB-TESTED` = قيد قاعدة بيانات مختبر فعلياً في TASK-6 (مع طفرة حيث ذُكر)؛ `DESIGNED` = موصوف فقط؛ `NOT RUN` = يحتاج خدمات غير موجودة؛ `PENDING` = ينتظر قرار المالك.

## 1. التهديدات عالية الأهمية

| التهديد | الضابط المقترح | موضع التطبيق | الاختبار المطلوب | الحالة | القرار المعلق |
|---|---|---|---|---|---|
| **T-EOP-01** موافقة ذاتية (Critical) | موافق ≠ مقدم ≠ منفذ؛ الموافق يحمل `issuer-approver` في المؤسسة نفسها (CTL-03/04) | `issuer.approval` قيود + FK مركب؛ C3 يستدعي `consume_approval` | DB-APR-01/02/08 (طفرة M3)؛ HTTP: PT على INT-05..07 | DB-TESTED؛ HTTP NOT RUN | OD-06، D-03 (معنى «موافقتين» DR-29) |
| **T-LC-04** إعادة/نقل approval_ref (Critical) | ربط بالفعل+الهدف+المؤسسة+تجزئة الطلب؛ عمر ≤30د؛ استهلاك ذري واحد | `consume_approval`، UNIQUE في `credential_transition` و`status_transition` | DB-APR-04/05/07/09، DB-STA-10 (طفرة M4) | DB-TESTED؛ C5 التحقق من التفويض المنقول NOT RUN | OD-06؛ approval_ref اختياري في العقد ⇒ `090` PENDING |
| **T-LC-02** سباق revoke/reinstate | CAS `row_version` + قفل صفي؛ 1 نهائي | `status.set_value` + مشغل | DB-STA-05/07/08 (طفرات M1/M2)؛ اختبار تزامن حقيقي متعدد الاتصالات NOT RUN | DB-TESTED (تسلسلي) | D-05: If-Match/expected_value غير موجود في العقد |
| **T-LC-03** فقد تحديث في النشر | `list_version` ضمن معاملة التغيير؛ النشر من لقطة؛ `published_version` أحادي | `status_list` | DB-STA-12/13؛ اختبار كاتبين متزامنين NOT RUN | DB-TESTED جزئياً | D-04 دلالة فشل النشر |
| **T-RESP-01** توجيه الرد لمضيف مهاجم | قائمة مضيفات دقيقة لكل متحقق؛ رفض wildcard/منفذ/مسار؛ فشل مغلق عند الغياب | `trust.response_host`؛ C2-B/C1 قبل الإرسال | DB-TRU-04/05؛ DB-PND-01 (عند تطبيق 090)؛ W16 مكتبة سابق | DB-TESTED؛ الإلزام PENDING | OD-07، D-02 |
| **T-SSRF-01** جلب عناوين يتحكم بها المهاجم | التحقق من التوقيع والثقة **قبل** أي جلب (Enhanced §7 خطوات 5–7 قبل 11)؛ مضيف الحالة من قائمة الثقة فقط؛ HTTPS؛ منع IP خاصة/link-local؛ مهلة TO-S وحجم | C2-B وC1؛ شبكة `app` داخلية + خروج بقائمة سماح | اختبارات SSRF (169.254.169.254، localhost، إعادة توجيه) | DESIGNED / NOT RUN | — (يحتاج اعتماد التسلسل REQ-VER-08) |
| **T-BOLA-01** IDOR على INT-13 | ملكية org+منشئ ثابتة في الجلسة؛ 404 موحد؛ 429 | `verification_session` (ملكية ثابتة) + فحص الخدمة | DB-VER-08؛ HTTP 404 عبر مؤسستين NOT RUN | DB-TESTED جزئياً | OD-01، D-08 |
| **T-JWT-02** خلط الجمهور | `aud` لكل خدمة، `iss` ثابت، alg ES256 فقط، الأدوار من مصدر موقع لا من claim عميل؛ رمز C3→C5 بـ`aud=status` | كل الخدمات + AuthProvider | سلبي: رمز verifier على C3، رمز C5 على C4 | DESIGNED / NOT RUN | OD-02، D-01 |
| **T-STAT-01** قائمة حالة أقدم | تتبع أعلى `iat` لكل uri ورفض الأقدم | كاش C2-B (ذاكرة) | سلبي: إعادة رمز أقدم صالح | DESIGNED / NOT RUN | — |
| **T-STAT-02** نافذة كاش ≤15د | `ttl` ≤15د؛ 304 لا يمدد الصلاحية؛ قبول المخاطرة صراحة | C2-B | REQ-REV-09 (LT-17) | DESIGNED / NOT RUN | D-12 قبول المخاطرة |
| **T-TRU-01** تسميم سجل الثقة | قائمة موقعة بمفتاح مفوض من جذر غير متصل؛ ترويسة JWS مثبتة (typ/alg/kid)؛ مفتاح ثقة منفصل؛ امتيازات `svc_trust` فقط | C4 + `trust_key` | DB-TRU-01/02 (هوية المفتاح)؛ توقيع القائمة NOT RUN | جزئي | OD-08، D-07، SC-19 |
| **T-TRU-02** إرجاع قائمة أقدم | `version` يتزايد بصرامة (مخزن) + المستهلك يحفظ آخر version | `trust_list_version` + C1/C2-B | DB-TRU-03 (طفرة M5)؛ المستهلك NOT RUN | DB-TESTED (الناشر) | — |
| **T-PRV-01** احتفاظ بالإفصاحات | لا أعمدة للقيم؛ ذاكرة ≤60ث، قراءة واحدة | مخطط `verifier` + C2-B | DB-PRV-01؛ فحص ذاكرة/قرص للخدمة NOT RUN | DB-TESTED (غياب الأعمدة) | OD-04 |
| **T-PRV-04** PII في السجلات | قائمة حقول سجل مغلقة؛ التدقيق بلا أعمدة قيم؛ LT-23 | السجلات + `audit_event` | LT-23 NOT RUN؛ فحص بنية الجدول DESIGNED | DESIGNED | — |
| **T-REPO-10** لا فحص أسرار خارج task2 | workflow فحص الأسرار على كل فرع وmain + حماية فروع | GitHub | تحقق وجود workflow على كل فرع | **مفتوح** — TASK-6 لا يغير إعدادات GitHub | D-13 |

## 2. قائمة التطوير (تُتحقق قبل أي PR لخدمة)

- [ ] لا سر/مفتاح خاص في المستودع (فاحص TASK-2 + `.gitignore`) — CHK-ENV-01
- [ ] `IQDID_ENVIRONMENT=TEST` وترويسة `X-Environment` — ENV-01/02
- [ ] لا تعطيل TLS (`NODE_TLS_REJECT_UNAUTHORIZED`, `rejectUnauthorized:false`) — CHK-ENV-05
- [ ] WebCrypto للتوقيع؛ لا `@sd-jwt/crypto-nodejs` — DR-12
- [ ] `statusVerifier` منفصل دائماً؛ لا `verifyStatus` منفرداً — DR-64/65
- [ ] كل استدعاء SDK يمر عبر Compatibility Adapter، ومع اختبار يثبت عدم وجود استدعاء مباشر (انظر Open Decisions C-3)
- [ ] تغييرات الحالة عبر `status.set_value` فقط؛ لا UPDATE مباشر من الشيفرة
- [ ] الموافقات عبر `consume_approval` فقط
- [ ] لا قيم إفصاح في القاعدة أو السجلات أو مخزن idempotency
- [ ] كل اختبار رفض يتحقق من السبب + طفرة (DR-67)
- [ ] صور الحاويات بـdigest؛ مستخدم غير root
- [ ] لا منافذ قاعدة بيانات منشورة

## 3. فحوص قائمة التطوير المؤتمتة في TASK-6

`tools/task6_checks.py`: YAML/Compose، الأسرار، قيود SQL، العلاقات، ربط الشبكات، عدم تحول PENDING إلى APPROVED، اكتمال المخرجات. النتائج في `TASK6_Test_Evidence.md`.
