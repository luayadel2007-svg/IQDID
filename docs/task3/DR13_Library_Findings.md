# نتائج المكتبات — FAIL محفوظ، بلا ترقيع إنتاجي

| ID | T | المشاهد | الخطورة | الحد المختبر | المعالجة المقترحة |
|---|---|---|---|---|---|
| DR13-F01 | T01 | empty proof algorithm array accepted | Medium | zCredentialIssuerMetadataSchema | nonempty algorithms guard قبل الاستخدام؛تكامل لاحق بعداعتمادالمواصفات |
| DR13-F02 | T01 | binding present without proof metadata accepted | Medium | zCredentialIssuerMetadataSchema | semantic dependency validation إضافي؛لا اعتماد على schemaSDK وحده |
| DR13-F03 | T01 | empty credential display array accepted | Low | zCredentialIssuerMetadataSchema | nonemptydisplay validation ؛لا تغيير إلزام presence |
| DR13-F04 | T02 | offer value and reference simultaneously accepted | Medium | resolveCredentialOffer | rejectboth before SDK resolve ؛لا fallback مستتر |
| DR13-F05 | T07 | empty credentials array emitted | Medium | createCredentialResponse | validate immediate response cardinality قبل الإرسال |
| DR13-F06 | T11 | supplied wallet metadata and nonce not emitted under expected fields | High interoperability | OpenID4VP mock POST transport | تصحيح adapter أو SDK fork يحتاج عملمحدد/مراجعة؛لا patch لتبعيةأساسيةهنا |

مراجع السبب:OID4VCI1.0§12.2.4/F01…03 ،§4.1/F04 ،§8.3/F05 ؛ OID4VP1.0§5.10/F06. هذه نتائج حدود API المكتبة المستخدمة، وليست حكماً أن كل caller داخلها يخالفالمعيار، ولا ضمانصلاحية Oracle كاملاً. أظهر inspect مصدر SDK أن arrays غيرمقيدة بـ nonempty ، ورابط offer يفضّل reference عندوجوده، ودالة VP تبني requestBody ثم ترسل objectToQueryParams(wallet.metadata) بدلاً منه. القيم السرية لم تعرض فيالتقرير أوالسجلات.

مسؤول المعالجة:مهندس identity/integration بعداعتمادالمواصفات. الخيارات:wrapper تعاقدي شامل مع integration tests أو fork موثق للإصدارالمثبت؛أيترقية تحتاج مراجعة Baseline وموافقة مستقلة. لم تُعدل التبعيات الأساسية أوشيفرة SDK أوالخدمات. وجود guards داخل tests لايعني تطبيقحمايةوقت التشغيل. لا تُخفضخطورة nonce غياباً إلى«تحذيرتحريري» ولا تُعلن 10/10.
