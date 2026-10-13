# DR13 — قبل وبعد

| النطاق | قبل | بعد | رمز الخروج |
|---|---|---|---|
| SDK_RAW DR13-T01…T14 (43 حالة منفذة) | 37 PASS / 6 FAIL | 37 PASS / 6 FAIL | 1 / 1 |
| ADAPTER_GUARD | لم تكن الطبقة موجودة | 42 PASS / 0 FAIL | 0 |
| مراجعة مستقلة ADAPTER_GUARD | NOT RUN | 42 PASS / 0 FAIL | 0 |
| HTTP_SERVICE (14 مجموعة) | NOT RUN | NOT RUN | لا يوجد |

| المشكلة | SDK_RAW بعد الإصلاح | ADAPTER_GUARD |
|---|---|---|
| F01 | FAIL | PASS: nonempty/unknown proof/optional context |
| F02 | FAIL | PASS: كلا اتجاهي العلاقة وغياب الحقلين |
| F03 | FAIL | PASS: nonempty/omission/valid name |
| F04 | FAIL | PASS: value/reference/conflict/order/duplicates/no delegate |
| F05 | FAIL | PASS: empty input/output/override/string/object/deferred |
| F06 | FAIL | PASS: both/one/neither، Unicode، encoding، headers، mock SDK transport، rejection propagation |

محاولة التطوير الأولى: 41 حالة، 40 PASS و1 FAIL متعلق بـundefined في الخرج المؤجل. محفوظة في `evidence/task3/task3c-20261012T235205Z/adapter-first/summary.json`، ولا تُستبدل. أحدث تشغيل معتمد: `evidence/task3/task3c-20261012T235414Z-d742c615`. runner الكلي يعيد 1 لأن SDK_RAW ما زال FAIL؛ لا يسمح نجاح الحارس بإخفائه.
