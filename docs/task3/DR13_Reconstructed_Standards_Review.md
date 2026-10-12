# DR13 — مراجعة السجل المعاد بناؤه مقابل النصوص الرسمية

تاريخ المراجعة: 13 أكتوبر 2026؛ candidate مصدر مستخرج وغير معتمد. المراجع: root. تمت مطابقة 12 موضعاً أساسياً وسؤالي الصفين 2394 و2444 مع نصوص OpenID4VCI 1.0 Final وOpenID4VP 1.0 وRFC6749/6750/8414. هذه مراجعة نصية جديدة، وليست اختبارات HTTP أو P04 أو إقراراً بقائمة تاريخية من 17 بنداً. المراجع الأخرى SD-JWT VC -19 وTSL -21 تبقى مثبتة كما في المشروع؛ ليست مصدر أحكام بنود OpenID/OAuth هنا.

| ID | سطر الأصل | المصدر/القسم | الحكم النصي المختصر | الحالة | اختبار مطلوب وحدوده | التغيير/الفصل المطلوب |
|---|---|---|---|---|---|---|
| C01 | 1996 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-12.2.4 | proof_types_supported وproof_signing_alg_values_supported مؤكدان؛ «طرق العرض» تعبير يحتاج تفكيكاً. | PARTIAL scope ambiguity | DR13-T01: metadata أسماء/نوع/خوارزمية؛ NOT RUN | تحديد المقصود بالعرض؛ لا نخلطه بربط مفاتيح الإصدار. |
| C02 | 2006 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-4.1.3; §12.1.1 | openid-credential-offer:// وcredential_offer_uri مؤكدان؛ المرجع HTTPS. | TEXT VERIFIED | DR13-T02: URI/query ومعاملات متنافية؛ NOT RUN | نص معياري؛ آلية نقلQR مشروع. |
| C03 | 2009 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-4.1.1 | اسم المصفوفة credential_configuration_ids. | TEXT VERIFIED | DR13-T03: array ومعرفات metadata؛ NOT RUN | توثيق الاسم الحرفي في مراجعة البروتوكول. |
| C04 | 2019 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-12.2.4; RFC8414 §3/3.3 | authorization_servers؛ غيابها يعيد الاكتشاف لمعرف المصدِّر؛ issuer المطابق لازم. | TEXT VERIFIED | DR13-T04: discovery issuer mismatch؛ NOT RUN | دمجAS داخلIssuer اختيارDR38 غير معتمد؛ لا اكتشافHTTP هنا. |
| C05 | 2022 | https://www.rfc-editor.org/rfc/rfc6749.html#section-5.1; OID4VCI §6.2 | access_token وtoken_type إلزاميان؛ expires_in موصى به، ليس MUST. | TEXT VERIFIED | DR13-T05: response fields/expiry؛ NOT RUN | خمس دقائق عمر المشروع مقترح؛ لا نجعله شرطOAuth عام. |
| C06 | 2047 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#appendix-F.1; §14.2 | iat إلزامي فيJWTproof؛ ±60ث سياسة مشروع وليست رقماً معيارياً. | TEXT VERIFIED | DR13-T06: absent/nonnumber/time bounds؛ NOT RUN | تمييز proof JWT عن KB-JWT؛ مهلة المشروع تحتاج اعتماد. |
| C07 | 2048 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-8.3; appendix-A.3.4 | credentials مصفوفة مشروطة؛ credential مطلوب داخل عنصرها، وصيغته حسب format. | TEXT VERIFIED | DR13-T07: immediate/deferred structure؛ NOT RUN | Immediate200 مقابلdeferred202؛ deferred خارج الشريحة اختيار مشروع. |
| C08 | 2050 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-8.3.1.1; RFC6750 §3.1 | 401/invalid_token موصى به للرمز غير الصالح؛ insufficient_scope عادة403. | TEXT VERIFIED | DR13-T08: bearer HTTP errors؛ NOT RUN | ترويسةWWW-Authenticate؛ لا خلط endpointOAuth معErrorResponse داخلي. |
| C09 | 2061 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-11.2 | نجاح الإشعار 2xx إلزامي؛ 204 توصية وليس رمز النجاح الوحيد. | TEXT VERIFIED; source qualified | DR13-T09: notification 2xx؛ NOT RUN | اختيار 204 مشروع متوافق؛ لا نرفض باقي2xx باعتبارها مخالفة معيارية. |
| C10 | 2063 | https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-11.3 | invalid_notification_id وinvalid_notification_request؛400 لهوية إشعار غير صالحة، وأخطاء المصادقة منفصلة. | TEXT VERIFIED | DR13-T10: bad-ID/auth separation؛ NOT RUN | حقل error مطلوب والأسماءSHOULD؛ لا تفاصيل شخصية. |
| C11 | 2086 | https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-5.10 | wallet_metadata هو الاسم؛ wallet_nonce يُعاد في طلب موقع عند استلامه. | TEXT VERIFIED | DR13-T11: POST metadata/nonce binding؛ NOT RUN | POST form-urlencoded؛لا خدمة request_uri مبنية. |
| C12 | 2088 | https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-5.9 | redirect_uri: لا يسمح بطلب موقع؛ اختيار x509_hash يلزم فحوصه. | TEXT VERIFIED | DR13-T12: signed redirect rejection؛ NOT RUN جديد | W14/W16 دليل سابق؛ هذه مراجعة نص لا تشغيل مكتبة جديد. |

الاقتباسات المباشرة اقتصرت على أسماء الحقول؛ الأحكام أعلاه بصياغة المراجع مع الإحالات. يُعاد فحص النصوص عند تنفيذ خدمة أوتغييرنسخة. الأصل غير المتحقق لا يعني أنه خطأ؛ بعضه صحيح وبعضه بحاجة إلى تقييد SHOULD/MUST أو سياسة مشروع.

السؤال2394: OpenID4VCI1.0 §6.3 يربط tx_code الخاطئ بـ invalid_grant؛ المفقود/المرسل دون توقع بـinvalid_request. لا اعتماد تلقائي لاسم invalid_tx_code من مسودة1.1 أخرى. اختبار DR13-T13 مطلوب،NOT RUN، مع فحص السجل V03 مستقلاً قبل ادعاء توافق التنفيذ.

السؤال2444: iat Required في proof JWT لكن النافذة 60 ثانية مقترح المشروع؛ استعمال nonce وفق endpoint وسياسته منفصل. اختبار DR13-T14 للانتهاء/الساعة/nonce،NOT RUN. هذا ليس بنداً تاريخياً جديداً ولا يُحسب مرتين لإنتاج العدد 17.

## المطابقة التاريخية

فحص المصدر Phase_2_Consolidated_Architecture_v1.1 (1).md في الأسطر 1860–2550 أثبت 17 ظهوراً للوسم [غ]، منها 12 صفاً أساسياً، ومرجعان متكرران، وثلاثة تعريفات أو تعليمات أو إحالات سجل. السجل المرفق يطابق هذا التفسير. المصدر لا يقدم 17 معرف حقل مستقل؛ لا نختلق خمسة بنود لملء العدد. قبول السجل كمصدر عمل بديل لا يساوي اكتشاف القائمة التاريخية، ويحتاج قرار مالك واضح يحدد نطاق إعادة البناء وحالة الإحالات.

التوصية: استعمال DR13-C01…C12 والسؤالين T13/T14 كأساس مراجعة مُعاد بناؤه، مع إبقاء تاريخ ادعاء العدد 17 وأسباب اختلافه. يظل C01 جزئياً لأن«طرق العرض» غير محدد في الأصل. لا إلزام لحقول جديدة أو تغيير YAML هنا. لا إغلاق AC-G1a-6 أو G1a قبل إقرار النطاق وحسم السؤال وتوثيق المراجعة المطلوبة.

Owner approval=PENDING؛DR13=PARTIAL؛EngineeringCompletion=PARTIAL؛G1a=BLOCKED. P04 الكامل وباقي OD والدفعة أ ومقترح projection ما زالت مستقلة عن هذا التحديث. الأعداد 56/56 وغيرها تخص تشغيل TASK3B السابق؛ لم تُعَد في هذه المراجعة النصية ولا تُنسب إليها.
