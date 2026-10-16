# CARPLAY_ANDROID_AUTO_FEASIBILITY

**Status: RESEARCH ONLY.** Nothing is built, and nothing is claimed as supported. Any in-car feature would come only after government approval, legal review, and the platform owners' own approval.

Sources were read on 2026-10-16:
- [Apple — CarPlay](https://developer.apple.com/carplay/)
- [Android — Build apps for cars](https://developer.android.com/training/cars)
- [Android — Car app quality guidelines](https://developer.android.com/docs/quality-guidelines/car-app-quality)

Where a source did not answer a question, the answer below is **NOT VERIFIED**.

## 1. Apple CarPlay: eligibility review

The CarPlay page lists these supported app types:
- audio;
- video (only when parked);
- messaging and VoIP (through SiriKit);
- navigation;
- EV charging, fueling, parking, public safety, quick food ordering;
- voice-based conversational apps;
- driving-task apps.

It also mentions widgets and Live Activities. Access requires a **CarPlay app entitlement** requested from Apple.

| Question | Finding |
|---|---|
| Is "digital identity / credential wallet" a listed CarPlay category? | **No.** It matches none of the listed types |
| Could IQDI request an entitlement anyway? | Only Apple can decide. Asking under an unrelated category (e.g. "driving task") would misrepresent the app. **Not to be attempted** |
| Widgets / Live Activities on CarPlay | Listed as supported. Whether an identity app's Live Activity is appropriate in a car is **NOT VERIFIED**. The CarPlay Developer Guide (PDF) holds the detailed rules and was not reviewed here |

**Eligibility: NOT ELIGIBLE as a CarPlay app category (based on the listed categories). BLOCKED BY PLATFORM POLICY** unless Apple publishes a suitable category.

## 2. Android Auto: eligibility review

Supported categories:
- Media (audio);
- Communication: messaging notifications, templated messaging (labs), calling (labs);
- Navigation;
- Point of Interest;
- Internet of Things;
- Weather;
- Games (parked only).

| Question | Finding |
|---|---|
| Is an identity or credential app a listed category? | **No** |
| Could IQDI use "messaging notifications"? | That category is for peer-to-peer messaging services (MF-1…MF-5: receive, group, reply, short-form). A verification-request alert is not person-to-person messaging, so using it would mis-categorise the app. **Not eligible** |
| General rule | PC-1: "The app must not include features outside the app types intended for cars." |

**Eligibility: NOT ELIGIBLE. BLOCKED BY PLATFORM POLICY.**

## 3. Android Automotive OS (separate platform)

This is the car's own Android system with built-in Google, and apps install on the car itself.

- Categories: Media, Navigation, POI, IoT, Weather, Video (parked), Games (parked), Browsers labs (parked).
- No identity category is listed.
- A parked-only browser exists only as a "labs" item on internal testing tracks.

**Eligibility: NOT ELIGIBLE / RESEARCH ONLY.** Showing a web wallet in the car's browser, even while parked, would put identity data on a shared vehicle display. That is unacceptable without a dedicated threat model.

## 4. Driver distraction and safety assessment

**Prohibited flows** (these must never reach a vehicle display):
- reading identity data;
- choosing or reviewing fields;
- approving or rejecting a disclosure;
- showing a credential (any «مستمسك»);
- scanning QR codes;
- entering anything sensitive;
- any flow longer than one glance.

Relevant platform rules:
- **AC-1:** tasks in five screens or fewer.
- **SA-1:** no animation.
- **ST-1:** no auto-scrolling text.
- **IU-1:** limited images.
- **VI-1:** "look at the phone only when it's safe".

These rules make even a simple review flow inappropriate while driving.

**The most that could ever be studied:**
- one spoken or one-line, **non-identifying** alert such as «لديك طلب تحقق جديد — راجعه على هاتفك عند التوقف»;
- no organisation name, purpose, or data shown;
- no action other than dismiss.

Even this needs an eligible category, which does not exist today.

## 5. Permitted vs prohibited feature matrix

| Feature | CarPlay | Android Auto | AAOS | Verdict |
|---|---|---|---|---|
| Show credentials or «مستمسكاتي» | ✗ | ✗ | ✗ | **Prohibited** (safety and privacy) |
| Review a request (organisation, purpose, fields) | ✗ | ✗ | ✗ | **Prohibited** |
| Approve or reject a disclosure | ✗ | ✗ | ✗ | **Prohibited** (consent needs attention and authentication) |
| Scan a QR code | ✗ | ✗ | ✗ | **Prohibited** |
| Generic "new request, check your phone when stopped" alert | No category | No category | No category | **BLOCKED BY PLATFORM POLICY**; research only |
| Phone-side notification mirrored by the OS (user's own phone setting) | System-controlled | System-controlled | n/a | Out of IQDI's control. IQDI should keep notification text **non-identifying** in any case (see the smartwatch data-minimisation policy) |

## 6. Security and privacy impact

Vehicle displays are shared (passengers) and may be logged or mirrored by the car's systems. Car head units are not under the citizen's control. Identity data and consent must therefore stay on the citizen's authenticated personal device.

## 7. Future approval dependencies

1. A government decision that an in-car alert is wanted at all.
2. A legal and road-safety review (traffic law on driver distraction).
3. A platform category that genuinely fits. It does not exist today.
4. A platform entitlement or review approval.
5. A threat model for shared displays.

## 8. Go / No-Go

**NO-GO** for CarPlay, Android Auto and Android Automotive OS. Re-evaluate only if:
- (a) Apple or Google publish an eligible category for identity or government-alert apps; and
- (b) dependencies 1–2 are met.

The rest of the IQDI design is unaffected: in-car use is not needed for the citizen journey.
