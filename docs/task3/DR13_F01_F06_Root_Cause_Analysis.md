# DR13 F01–F06 — تحليل السبب والمطابقة

أعيد تشغيل الاختبارات الأصلية دون تعديلها: 43 حالة، 37 PASS و6 FAIL. راجع المراجع المستقل النصوص ونقاط الاستدعاء ولم يجد توقعاً معيارياً خاطئاً في النتائج الست. الاختبارات الخام تصف حدود SDK المحددة، لا جميع استخدامات المكتبة.

| ID | النص المعياري | السبب في SDK 0.7.0 | موضع المعالجة والمخاطر |
|---|---|---|---|
| F01 | OID4VCI 1.0 §12.2.4: مصفوفة خوارزميات الإثبات غير فارغة لكل نوع إثبات معلن | z.array بلا قيد حد أدنى | guardMetadata قبل schema؛ لا قائمة خوارزميات جديدة ولا افتراض نوع معرف موحد |
| F02 | §12.2.4: proof_types_supported موجود إذا وفقط إذا كان cryptographic_binding_methods_supported موجوداً | لا تحقق ارتباط بين الحقلين | guardMetadata في الاتجاهين؛ غياب كليهما مقبول |
| F03 | §12.2.4 credential_metadata.display اختياري وغير فارغ عند وجوده | المصفوفة تقبل الطول صفر | guardMetadata؛ لا يجعل display إلزامياً ولا يخلط بين عرض المصدر وعرض الاعتماد |
| F04 | §4.1: عرض الإصدار بالقيمة أو المرجع، لا كليهما | resolveCredentialOffer يفضل المرجع عند وجوده | فحص query قبل أي SDK/fetch؛ رفض التكرار احتياط منع غموض، لا سياسة hosts |
| F05 | §8.3: credentials عند وجوده يحوي اعتماداً واحداً على الأقل؛ العنصر object والاعتماد string أو object حسب الصيغة | createCredentialResponse يقبل [] | قبل الإنشاء وبعده، مع دمج additionalPayload للفحص؛ undefined يُحذف عند JSON ويعامل كغياب |
| F06 | OID4VP 1.0 §5.10 و§5.10.1 | fetchJarRequestObject يبني requestBody ثم يرسل wallet.metadata مفككاً، فيفقد الغلاف والnonce | تصحيح fetch المحدد مع POST وHTTPS وAccept وform UTF-8؛ الاستجابة تبقى للتحقق في SDK |

المراجع الأصلية: https://openid.net/specs/openid4vci-1.0.html وhttps://openid.net/specs/openid4vp-1.0.html . هاشات نسخ HTML المستخدمة وإصدارات الحزم محفوظة في provenance.json. مواضع SDK: openid4vci/dist/index.mjs (resolveCredentialOffer، schemas، createCredentialResponse)، openid4vp/dist/index.mjs (fetchJarRequestObject). لا نسخ معدلة ولا fork.

تمييز Oracle: ظهر فشل تطوير إضافي في حارس الإصدار المؤجل بسبب وجود خاصية JS بقيمة undefined؛ أصلح الحارس بدلاً من تغيير توقع قبول الإصدار المؤجل. احتفظت الأدلة بمحاولة 40/41 ثم 42/42. لم تتغير توقعات اختبارات SDK_RAW أو ملفاتها.
