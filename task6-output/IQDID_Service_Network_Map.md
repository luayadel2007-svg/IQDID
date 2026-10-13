# IQDID — خريطة الخدمات والشبكة وحدود الثقة (TASK-6)

> نموذج تجريبي — TEST ONLY. كل ما هنا **مقترح** وغير معتمد. حدود الثقة TB-xx من سجل TASK-4.

## 1. المكونات والمنافذ المقترحة

| المكوّن | الاسم المحلي (`.test`) | منفذ التطوير (Windows دون Docker، 127.0.0.1) | داخل الحاوية | الشبكة (Compose مستقبلاً) | يُنشر للمضيف؟ | المرحلة |
|---|---|---|---|---|---|---|
| Reverse proxy (توجيه SNI دون إنهاء TLS) | — | 8443 | 8443 | edge + app | نعم: `127.0.0.1:8443` فقط | مقترح |
| C3 Issuer | `issuer.digital-id.test` [OAS] | 9101 | 8443 | app + data | لا (عبر proxy) | شريحة (بعد G1a) |
| C4 Trust Registry | `trust.digital-id.test` [OAS] | 9102 | 8443 | app + data | لا | شريحة مصغرة |
| C5 Status Service | `status.digital-id.test` [OAS] | 9103 | 8443 | app + data | لا | شريحة مصغرة |
| C2-B Verifier | `verifier.digital-id.test` [OAS] | 9104 | 8443 | app + data + egress-allowlist | لا | شريحة |
| AuthProvider (TEST IdP) | `auth.digital-id.test` [مقترح] | 9105 | 8443 | app | لا | OD-02 معلق |
| C6 Audit (محلي) | — (جدول `audit.audit_event`) | — | — | data | لا | محلي في الشريحة؛ INT-14..16 مرحلة 4 |
| C2a واجهة المتحقق | `verifier.digital-id.test/ui` | 9110 | 8443 | app | لا | شريحة |
| PostgreSQL | `db` | 5432 على unix socket/loopback | 5432 | data (internal) | **أبداً** | مقترح |
| Web Wallet (C1 ويب) | `wallet.digital-id.test` | 9120 | 8443 | edge | لا | **لاحقاً** (G1b، DR-09) |

ملاحظات: المنافذ > 1024 لتجنب صلاحيات المدير على Windows. التوجيه بالـSNI يحافظ على توصية DR-06 (TLS داخل التطبيق) — PENDING. الوصول من هاتف حقيقي يتطلب ربطاً على عنوان LAN وهو قرار G1b (DR-06/DR-09، DEV-00) — لا يُفعّل افتراضياً.

## 2. مصفوفة الاتصالات (الاتجاه = من يبدأ الاتصال)

| # | من → إلى | الواجهة | المصادقة | TB | ضوابط إلزامية |
|---|---|---|---|---|---|
| F1 | C1 → C3 | STD-02..06 (OpenID4VCI) | رموز البروتوكول | TB-01 | HTTPS، `no-store`، حدود حجم GR-08، offer_ref جلب واحد |
| F2 | C1 → C2-B | STD-09 جلب الطلب، STD-10 direct_post | nonce/KB-JWT | TB-01, TB-12 | جلب واحد، رد واحد، 120ث، 64KB |
| F3 | C1/C2-B → C4 | INT-10 قائمة الثقة | عام + توقيع JWS | TB-05 | version متزايد (T-TRU-02)، ترويسة JWS مثبتة |
| F4 | C2-B → C5 | STD-11 رمز قائمة الحالة | عام + statusVerifier | TB-05 | مضيف من قائمة الثقة فقط (T-SSRF-01)، كاش ≤15د، iat لكل uri (T-STAT-01) |
| F5 | C2a → C2-B | INT-11..13 | staffSession (OD-02) | TB-02, TB-14 | 404 موحد، ملكية org+منشئ (OD-01)، 429 |
| F6 | مشغل/سلطة → C3 | INT-01..07 | serviceToken/بشري (OD-02) | TB-03 | أدوار x-roles، approval_ref (OD-06) |
| F7 | C3 → C5 | INT-08/09 | serviceToken، aud=status (T-JWT-02) | TB-04 | Idempotency-Key، CAS، فصل الأدوار (D-06) |
| F8 | كل خدمة → AuthProvider | مفاتيح JWKS **من إعداد محلي مثبت**، لا جلب شبكي اعتباطي | — | TB-04 | iss/aud/exp/nbf، alg ثابت |
| F9 | كل خدمة → DB | SQL | دور DB لكل خدمة (scram) | TB-07 | امتيازات دنيا (`001_schema.sql` §grants) |
| F10 | كل خدمة → C6 | INSERT تدقيق | دور الخدمة | TB-07 | بلا PII، سلسلة تجزئات |
| F11 | خدمات → الإنترنت | — | — | — | **ممنوع**؛ شبكة app داخلية |
| F12 | C5/C4/C3 → مواد المفاتيح | ملفات مشفرة/مخزن | حساب نظام منفصل (D-11) | TB-06, TB-08 | مفتاح لكل غرض، الجذر خارج المضيف |

اتجاهات ممنوعة صراحة: C5 → C3 (C5 لا يعرف هوية المواطن)، C2-B → C3، أي خدمة → DB لخدمة أخرى، أي اتصال وارد إلى `data`.

## 3. الشبكات (Compose المقترح)

```
[Host 127.0.0.1:8443] ── edge ── proxy ── app(internal) ── C2-B, C3, C4, C5, Auth, C2a
                                                └─ data(internal) ── db
C2-B egress: عبر proxy خروج بقائمة سماح مضيفات الحالة/الثقة فقط (مقترح؛ T-SSRF-01)
```

`internal: true` يمنع الخروج للإنترنت من app/data. هذا **عزل تطوير**، ليس حدّاً أمنياً إنتاجياً.

## 4. Least Privilege — ملخص

| الكيان | يملك | لا يملك |
|---|---|---|
| svc_issuer | issuer.* (بلا DELETE)، قراءة iam، INSERT تدقيق | status.*، trust.*، قراءة التدقيق |
| svc_status | status_entry INSERT + UPDATE(value,row_version)، status_list UPDATE(versions) | iam.*، issuer.* (مُختبر DB-STA-14)، DELETE (DB-STA-15) |
| svc_trust | trust.* | issuer/status/verifier |
| svc_verifier | verification_session (بيانات وصفية)، قراءة principal/role | أي جدول لقيم الإفصاح (غير موجود — DB-PRV-01) |
| audit_reader | SELECT تدقيق | كتابة |
| svc_retention | `ops.purge_expired()` فقط | جداول مباشرة |

## 5. PoC مقابل الإنتاج المستقبلي

| البند | PoC (هذا التصميم) | إنتاج حكومي `[مستقبلي]` |
|---|---|---|
| العزل | شبكات Docker على حاسوب واحد | شبكات منفصلة/VPC، جدران نارية، مناطق DMZ |
| TLS | جهة TLS اختبارية منفصلة (SEC-06) | Web PKI عامة + mTLS داخلي |
| المفاتيح | ملفات مشفرة TEST | HSM معتمد، حفل مفاتيح |
| الهوية | AuthProvider اختباري | IdP حكومي، MFA، إدارة هويات |
| التوفر | نسخة واحدة (SPOF مقبول — D-12) | تكرار، DR، مراقبة 24/7 |

**لا يُدّعى** أن Docker Compose يوفر أمان الإنتاج.
