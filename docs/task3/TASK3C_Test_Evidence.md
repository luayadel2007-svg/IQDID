# أدلة TASK3C وإعادة التنفيذ

الأدلة الأولية والمراجعة: `evidence/task3/task3c-20261012T235205Z`. التشغيل النهائي: `evidence/task3/task3c-20261012T235414Z-d742c615`. الانحدار: `evidence/task3/20261012T235415Z-8debeb48`. لكل تشغيل raw stdout/stderr وsummary وأوامر ورموز خروج؛ execution.json يسجل SHA-256 للشيفرة والاختبارات والlockfile. provenance.json يسجل إصدارات الحزم وتراخيصها وهاش النصوص المعيارية. preservation.json يسجل الملفات السابقة و18 ملف G1 مجمد.

الأمر المنفذ من جذر worktree:

```sh
DR13_SDK_ROOT=/workspace/scratch/e5c8f9cdae15/dr13-sdk python tests/contracts/task3/compatibility/run-task3c.py
```

النتيجة: exit 1 بسبب SDK_RAW؛ ADAPTER_GUARD exit 0. لإعادة التنفيذ في بيئة أخرى يحدد DR13_SDK_ROOT إلى تثبيت معزول مطابق لـtests/contracts/task3/dr13-sdk/package-lock.json (npm ci --ignore-scripts). لم يُعدّل lockfile أو إصدار أي تبعية في هذه المهمة.

أمر الانحدار المنفذ:

```sh
TASK3_TOOL_ROOT=/workspace/scratch/e5c8f9cdae15/task3-tools TASK3_SPECTRAL_ROOT=/workspace/scratch/e5c8f9cdae15/task3-spectral TASK3_P04_ROOT=/workspace/scratch/e5c8f9cdae15/p04-tools python tests/contracts/task3/run-validation.py
```

exit 0؛ جميع الأوامر الفرعية exit 0. 4 OpenAPI،56 عقد،56 هندسي،16 RP،18 P04 بنيوي. هذا لا يغلق P04 الكامل أو أي بوابة. Linux/Node24 تشغيل فعلي؛ Windows وActions لهذه الدورة NOT RUN. مفاتيح SDK_RAW وهمية مؤقتة بالذاكرة فقط.

سلامة الحزمة: كل ملفات G1 الثمانية عشر متطابقة بايتياً. الملف tools/run-g1-suite.ps1 له تحويل نهايات سطور عند checkout فقط، لم يُحرر ولا يدخل commit؛ blob المستودع محفوظ. لم تتغير أي ملفات قديمة في حزمة التسليم. فاحص TASK2 يستخدم لقطة Index مستقلة مع قواعده الأصلية؛ نتيجته محفوظة في secret-scan.*.

فحص TASK2 النهائي: PASS، exit 0، 318 ملفاً مفحوصاً، findings=[] وerrors=[].
