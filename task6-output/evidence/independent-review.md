# TASK-6 — سجل المراجعة المستقلة (مراجعة واحدة)

المراجع: وكيل مستقل للقراءة فقط، لم يعدل أي ملف. الحكم الأولي: 2 حاجبة، 13 غير حاجبة.

| # | النتيجة | المعالجة |
|---|---|---|
| 1 | حاجبة: svc_issuer يملك UPDATE على approval ⇒ إعادة استعمال | سُحب UPDATE؛ `consume_approval` SECURITY DEFINER؛ مشغل ثبات؛ DB-APR-11/12/13؛ طفرة M10 |
| 2 | حاجبة: قيم موسومة [OAS] لا تطابق المسودة | state وiat/exp وOfferState وconfiguration_id وlist_id وreason_code طابقت العقد؛ trust-admin موسوم PROPOSED |
| 3 | عبور مؤسسات في approval/credential | FK مركبة (org, credential)، (org, offer)، (org, consumed_by)؛ DB-APR-14، DB-ISS-06 |
| 4 | ثلاثة أطراف مختلفة غير مفروضة | `approval_executor_not_requester`؛ DB-APR-10؛ M11 |
| 5 | تغيير غرض المفتاح ممكن | مشغل ثبات + UPDATE(retired_at) فقط + منع الحذف؛ DB-TRU-07..11؛ M12 |
| 6 | تمديد عمر الجلسة/العرض، تصفير tx_attempts | منح أعمدة محدودة + مشغلات ثبات + رفض بعد الانتهاء؛ DB-VER-09..11، DB-ISS-07/08؛ M14 |
| 7 | تكرار القيمة نفسها غير idempotent | no-op لأي v_old = p_value؛ DB-STA-18 |
| 8 | تجزئة التدقيق تعتمد على إعدادات الجلسة | نص قانوني (epoch µs) + `TimeZone=UTC` للدالة |
| 9 | ترتيب السلسلة ≠ seq تحت التزامن | `chain_pos` يُسند بعد القفل؛ DB-AUD-05 يتبع chain_pos |
| 10 | سباق نسخة قائمة الثقة | قفل استشاري في المشغل |
| 11 | svc_status يتجاوز set_value | set_value SECURITY DEFINER؛ سُحب UPDATE المباشر؛ التخصيص يبدأ بـ0؛ DB-STA-16/17/19؛ M13 |
| 12 | فصل D-06 في 090 غير قابل للعمل | أصبح قابلاً (DEFINER)؛ التعليق صُحح |
| 13 | healthcheck مبكر | `pg_isready -h 127.0.0.1`؛ وثّقت قابلية قراءة ملف السر |
| 14a | «Compose config لم يُشغَّل» | **مرفوضة بالدليل**: `docker compose config -q` نُفذ برمز خروج 0 (`run-compose-config.log`) |
| 14b | سبب خاطئ لفشل المصادقة في الدليل | صُحح |
| 15 | أنماط العقد وsuperuser للخيار A | طوبقت الأنماط؛ أُضيف شرط superuser |

بعد المعالجة: 75/75 اختبار قاعدة، 14/14 طفرة، 15/15 فحص ساكن، 4/4 طفرات فاحص. لم تُطلب جولة مراجعة ثانية (حد المراجعة الواحدة).
