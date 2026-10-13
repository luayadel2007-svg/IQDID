# المراجعة النهائية لمسودة OpenAPI v1.1

4 عقود /14 عملية، strict YAML وSwagger validate/dereference وAJV وأمثلة وguard مخصص. العقود 1.1.0-draft وproposed-not-approved. القيود الجديدة حالات نجاح العملية و404 تصحيح اتساق؛ لا تفعيل قرارات OD-06/07.

| العملية | الطريقة والمسار | المخوّل في المسودة | الاستجابات | حاجة الذرية/وقت التشغيل | الدليل التنفيذي |
|---|---|---|---|---|---|
| createOffer | POST /internal/v1/offers | issuer-operator | 201,400,401,403,404,409,422,429,503 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| getOffer | GET /internal/v1/offers/{offer_id} | issuer-operator,auditor | 200,400,401,403,404 | لا read فقط؛ freshness/authorization عند التطبيق | NOT RUN HTTP |
| cancelOffer | POST /internal/v1/offers/{offer_id}/cancel | issuer-operator | 204,400,401,403,404,409 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| getCredentialRecord | GET /internal/v1/credentials/{credential_id} | issuer-operator,issuer-authority,auditor | 200,400,401,403,404 | لا read فقط؛ freshness/authorization عند التطبيق | NOT RUN HTTP |
| suspendCredential | POST /internal/v1/credentials/{credential_id}/suspend | issuer-authority | 200,400,401,403,404,409,422,503 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| reinstateCredential | POST /internal/v1/credentials/{credential_id}/reinstate | issuer-authority | 200,400,401,403,404,409 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| revokeCredential | POST /internal/v1/credentials/{credential_id}/revoke | issuer-authority | 200,400,401,403,404,409,503 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| allocateStatusIndex | POST /internal/v1/status/allocations | status-allocator | 201,400,401,403,409,503 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| setStatusValue | PUT /internal/v1/status/entries/{list_id}/{idx} | status-allocator | 200,400,401,403,404,409,422 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| getStatusListToken | GET /lists/{list_id} | public | 200,400,404 | لا read فقط؛ freshness/authorization عند التطبيق | NOT RUN HTTP |
| getTrustList | GET /trust/v1/trust-list | public | 200,304,400 | لا read فقط؛ freshness/authorization عند التطبيق | NOT RUN HTTP |
| listServices | GET /verifier/v1/services | verifier-staff | 200,400,401,403 | لا read فقط؛ freshness/authorization عند التطبيق | NOT RUN HTTP |
| createSession | POST /verifier/v1/sessions | verifier-staff | 201,400,401,403,404,409,429 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |
| getSessionResult | GET /verifier/v1/sessions/{session_id} | verifier-staff | 200,400,401,403,404 | نعم: تفويض/حدوث أثر/محو/نشر | NOT RUN HTTP |

طلبات/ردود العمليات محددة في YAML، والأمثلة تُفحص ضد schemas المفكوكة نفسها. 204/304 دون body. 400 للصيغة، 401 للهوية، 403 للدور، 404 للموارد غير الموجودة/غير المسموحة حسب OD-01، 409 للحالة/idempotency، و422/429/503 فقط في العمليات التي كانت تحتاجها. لا تعميم لكل أكواد الخطأ. لا تفاصيل PII أو token في مخطط الخطأ؛ message الحر لا يمنع leak في خدمة مستقبلية، لذلك سياسة رسائل allowlist واختبار runtime مطلوبان. تجاهل x-roles من الخادم ليس اكتشافاً بنيوياً؛ جدول guards يكتشف تغييره في العقد فقط.

Cross-service: reason_code الخاص بتغيير الحالة متسق بين C3 وC5، reinstated مخصص للرفع، مع منع تكرار enum في guard. schemas الخطأ متطابقة. status_ref.uri URI وidx nonnegative integer، ليس مضموناً ضمن حجم 8192 دون lookup؛ يُفحص في الخدمة المستقبلية. organization_id مصدره principal موثوق لا body. Session UUID ليس credential. iat/exp NumericDate، published_at/expires_at RFC3339؛ لا يفرض schema وحده ترتيب الأوقات أو الساعة.

Adapter contract ما زال يحتاج اعتماداً: Trust.fields[].claim string وVerifier.requested_fields[].path string-array مختلفان. توصية الشريحة: جدول claims صريح موقّع/معتمد يحول flat claim إلى [claim]؛ nested claims تتطلب path catalog صريحاً، ولا تقسيم dot-string تلقائي. declared_retention نص عرض محلي مشتق من retention object نفسه، لا مصدر سياسة ثانٍ. ServicePolicy لا يحتوي display service name مستقلاً؛ name_ar/name_en من كتالوج خدمة موثوق مطابق service_id. لا نحول purpose إلى اسم بالاستنتاج. fields.class يجب أن يُنسخ دون تخفيف، ويتم فحص كل claim ضد allowed/prohibited policy قبل consent. هذا مقترح documented لا adapter منفذ؛ يمنع إعلان الاتساق التنفيذي الكامل.

| المرجع الرسمي المثبت | القسم | حكم المراجعة |
|---|---|---|
| https://www.ietf.org/archive/id/draft-ietf-oauth-sd-jwt-vc-19.html | §2.2/2.3/2.4 | typ=dc+sd-jwt وvct ومعالجة الإفصاحات؛ P04 فك/بنية فقط، لا conformance كامل |
| https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html | §4.1/4.1.1، §8/11، §12/Appendix A.3 | credential_offer_uri HTTPS؛ credential_configuration_ids، proof_types_supported/jwt/proof_signing_alg_values_supported؛ 204 توصية notification، ليس رمز النجاح الوحيد |
| https://openid.net/specs/openid-4-verifiable-presentations-1_0.html | §5.9/5.10/6/8 | x509_hash مشتق DER leaf SHA256 b64url؛ signed request/chain؛ wallet_metadata اسم الحقل؛ host allowlist إضافية مشروع |
| https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-21.html | status reference/token/validation | status.idx في الاعتماد لازم لمعرفة موضعه؛ لا حذفه لتقليل metadata؛ 2 bits/8192 وTTL≤15min وسياسة الدور/نهائية الإلغاء اختيارات مشروع |
| https://www.rfc-editor.org/rfc/rfc7638.html | §3/3.2 | canonical public EC members crv/kty/x/y؛ fingerprint شهادة مختلف عن هوية المفتاح |
| https://www.rfc-editor.org/rfc/rfc8725.html | §3.1/3.8/3.9/3.12 | allowlist خوارزميات، issuer/aud validation، منع substitution؛ ملف JWT الداخلي TBD |

DR-13: صفوف الأصل المستعادة تجعل مراجعة أسماء بعض الحقول ممكنة، لكن لا تُغلق البنود الـ17 كمجموعة بلا قائمة الأصل الدقيقة. حقول البروتوكولات المعيارية ليست endpoints أعيد تعريفها في OAS الداخلي. عرض نتائج مكتبة لا يثبت final specification أو HTTP error semantics. TLS/X509 سلسلة/إبطال/جهاز لا اختبار جديد لها، DR-49 متخصص مستقل مطلوب.

Lint: Spectral صفر أخطاء و4 info-contact warnings؛ Redocly صفر أخطاء و4 info-license + TrustListPayload unused. x-payload-schema يربط compact JWS بحمولته دون تغيير media type إلى JSON؛ Redocly لا يحسب هذا extension usage. لم يُعطّل rule أو يُختلق اتصال/ترخيص لإزالة warning.
