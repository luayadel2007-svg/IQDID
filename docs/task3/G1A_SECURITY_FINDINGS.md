# النتائج الأمنية النقدية

| ID | الخطورة | النتيجة | المعالجة والحالة | الدليل/المسؤول |
|---|---|---|---|---|
| F01 | High | runner يستبدل أدلة قديمة | FIXED: fresh directory exist_ok=False | run-validation.py؛ تاريخي محفوظ |
| F02 | Medium | رد lifecycle يناقض العملية | FIXED: const state | 9 positive/negative state tests |
| F03 | Medium | 404 غير موثق | FIXED: meaningful resource 404 | M10 وguard |
| F04 | Medium | auth removal وanonymous OR تمر في guard | FIXED: explicit protected/public + anonymous refusal | M19/M20 expected diagnostics |
| F05 | Medium | طفرات assertion-only/قبول أي سبب رفض | FIXED: shared guard + intended diagnostics | M01…M20، ليس جميع الأرقام guard mutations |
| F06 | Medium | cache 304 قد يعيد صلاحية signed token | DOCUMENTED: لا يمدد exp/version | runtime cache NOT RUN |
| F07 | High | schema union لا يفرض projection دور caller | OPEN: OD05 وخدمة مستقبلية | authority/operator schemas؛ HTTP NOT RUN |
| F08 | High | منظمة/مالك/موافقة/TTL/سباقات لا توجد خدمة | OPEN: owner + runtime evidence | proposed models فقط |
| F09 | Medium | adapter claims/retention/name غير محدد تنفيذياً | OPEN: catalog explicit proposal | Final_Review؛ موافقة لازمة |
| F10 | Medium | P04 signature/interop والـ17 DR13 والدفعة أ ناقصة | PARTIAL/BLOCKED | vectors/source markers؛ لا اكتمال مزعوم |

مسؤول اعتماد OD: مالك المشروع؛ مسؤول التنفيذ لاحقاً: مهندس الخدمة المعنية بعد اعتماد المواصفات؛ مسؤول DR49: مراجع أمني مستقل مختص بالهوية وPKI. agent review داخل هذا العمل مستقل عن كتابة root لكنه ليس تدقيقاً بشرياً متخصصاً ولا شهادة أمنية. الأخطاء العامة ذات message لا تزال مساحة تسريب محتملة إذا طبقتها خدمة بلا redaction/allowlist. الفاحص البنيوي لا يضمن جميع keywords/dialects؛ يعمل مع Swagger/AJV/lint ولا يحل محلها.
