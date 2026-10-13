# تصميم طبقة التوافق التجريبية

المسار: tests/contracts/task3/compatibility/adapter.mjs. نموذج تكامل مستقبلي مع dependency injection؛ لا خدمة ولا تسجيل تلقائي في التطبيق. يستورد caller المكتبات المثبتة ويمررها للدوال. لا يستورد Adapter أدوات oracle الأصلية، والاختبارات تتحقق من النتيجة ومن عدم استدعاء delegate عند الرفض.

| API | الحد |
|---|---|
| parseIssuerMetadata(sdk, metadata) | guard دلالي ثم schema SDK؛ لا تعديل للمدخل |
| resolveCredentialOffer(client, uri) | query guard قبل resolver؛ الأخطاء تبقى أخطاء |
| createCredentialResponse(issuer, options) | فحص credentials بعد أخذ additionalPayload بالحسبان ثم فحص output؛ deferred يبقى صالحاً |
| resolveWalletRequest(sdk, options) | request_uri_method=post وHTTPS ونقل صريح injected؛ يعوض fetch المحدد فقط ويعيد نتيجة SDK |

F06: JSON.stringify مرة واحدة للmetadata، ثم URLSearchParams لترميز form UTF-8. nonce يبقى string مستقلاً بما فيه + و& و= و%؛ لا يعامل قيمة raw كquery. الحقلان اختياريان: كلاهما أو أحدهما أو غيابهما. Accept=application/oauth-authz-req+jwt وContent-Type=application/x-www-form-urlencoded. يحذف Content-Length القديم حتى يعيد النقل حسابه. لا يغيّر GET أو fetch إلى عنوان آخر. يرفض request_object_signing_alg_values_supported مع redirect_uri بدلاً من إرسال حقل ممنوع. هذه حدود معيارية، لا اعتماد OD.

اختبار النقل يستخدم SDK الحقيقي ونقل mock، ويعيد JAR غير صالح عمداً: يجب أن يرفضه SDK بعد التقاط الطلب الصحيح. لا تفسير لهذا الرفض كنجاح تحقق توقيع أو nonce في استجابة موقعة. أخطاء النقل تبقى رفضاً. اختبار stub منفصل يثبت تمرير نتيجة delegate فقط، وليس تحقق الثقة.

الحدود: لا تحقق شامل للصيغ أو destinations أو trust أو authorization. لا يضمن عدم تجاوز الطبقة؛ يتطلب دمجاً واختبارات تشغيلية لاحقة. لا تعويض لأخطاء SDK خارج F01–F06. لا تغيير baseline Node أو lockfiles؛ التشغيل المتاح Node24، والbaseline المعتمد يبقى كما هو.
