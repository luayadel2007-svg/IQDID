# تغييرات Git لـTASK3B

الأساس HEAD86102ac3bd35eed7817b7e7f4fd909beac4f6dc0 في task3/g1a-openapi-review؛ فوق TASK1 13d3ea5be2698cf2227f4e5f553dee2f2c473394. فُحصت فروعmain/TASK1/TASK2 ولم تتغير في هذه الدورة. الكتابة فقط فيopenapi/v1.1،docs/task3،tests/contracts/task3،evidence/task3.

تغييرات YAML تشمل formatting من Document writer بالإضافة إلى semantic corrections موثقة في ChangeLog؛ أدوات lint/test أعيدت بعد آخر تغيير code. candidate-tested-sha256.json يربط جميع YAML وأدوات الاختبار بالبايتات المختبرة؛ هو مرجع التطابق للالتزام النهائي، لا ادعاء أن اختبار قديم عمل علىcommit جديد. التقارير والأدلة أضيفت لاحقاً ولا تغير code المختبر. لا تعديل package manifests/locks أو أساسNode أوworkflows/hooks/security أوtoolsofTASK1/2.

run-g1-suite.cmd أظهر اختلافtext-filter عند cloneLinux؛ original Git blob bytes تم التحقق منها واستعادتها وهي مطابقة للHEAD. قد يبقىgit status M بسبب CRLF المخزن معtext attributes؛ ليس تغيير محتوى، ولا يُدرج في commit. preservation-final.json يثبت عدم تغيير أي ملف خارج النطاق وبقاء الأدلة التاريخية. frozen-verification-task3b.json يؤكد18/18 Gitblob/SHA256. لا تعديل محتوى مجمد حتى للاختبار السلبي.

قبل الرفع: قراءة رأس الفرع الحالي؛ lease expected_sha؛ fast-forward جديد دونforce. إذا تقدم الفرع يراجعdiff قبل إعادة محاولة. PR2 يبقىDraft ولاmerge أوإعدادإداري. قائمةfiles/hash المرجعية لكل تغيير فيdelivery-manifest.json تحت مجلدالأدلةالنهائي. لا نسخ ملفاتTASK1ZIP الكبيرة أوالحزمةالمجمدة في التغيير.
