# SMARTWATCH_FUTURE_ARCHITECTURE

**Status: RESEARCH ONLY / PLANNED.** There is no watch app and nothing has been tested on a watch. Apple Watch and Wear OS support are **not** claimed. Anything beyond a research prototype needs official approval and a security assessment first.

## 1. Feasibility study

| Platform | What the platform offers (source) | Fit for IQDI |
|---|---|---|
| **Wear OS** | Phone notifications are **bridged** to paired watches by default; a bridged notification includes a button to open the app on the phone. A standalone watch app is needed only for watch-native features, and then the Bridging APIs avoid duplicates ([Android — Wear OS notifications](https://developer.android.com/training/wearables/notifications)) | A **notification-only** companion is feasible from the phone app's notifications, without a watch app |
| **Apple Watch / watchOS** | iPhone notifications are generally mirrored to a paired Watch, and a watchOS app is needed for a custom notification interface. **NOT VERIFIED**: the Apple page could not be read in this session; confirm against Apple documentation before design | Same pattern expected; must be verified |
| Other watches | Depends on vendor SDKs and phone bridging | **NOT VERIFIED**; research case by case |

**Important:** a web app (the current IQDI Wallet) cannot run on any of these watches. Web push to a browser is possible, but how it bridges to a watch is OS-controlled and was not tested. Any watch feature therefore depends on the native mobile apps (`NATIVE_IOS_ANDROID_BLUEPRINT.md`).

## 2. Watch interaction map (proposed, minimal)

| Moment | Watch shows | Watch actions | Phone |
|---|---|---|---|
| New verification request | «طلب تحقق جديد في IQDI» (no organisation name, purpose or fields by default) | Open on phone · Dismiss | The phone opens the request review |
| Request expiring soon | «ينتهي طلب قريباً» | Open on phone | Review on the phone |
| Decision recorded (on the phone) | «سُجّل قرارك» (no outcome details) | Dismiss | — |
| Wallet status | «المحفظة نشطة» / «يلزم فتح المحفظة» | Open on phone | — |

**Explicitly excluded from the watch:**
- approving or rejecting a disclosure;
- showing credentials or any «مستمسك»;
- showing claim values;
- QR presentation;
- changing settings.

## 3. Data-minimisation policy

1. **Watch payloads carry no personal data.** No name, ID number, birth date, organisation, purpose or requested fields. They carry a category and an opaque reference only.
2. The details are fetched **on the phone**, after the phone's own authentication.
3. Notification text is written for a locked screen: assume someone else can read it.
4. Users can turn watch alerts off. They should be off by default until a user study shows they are wanted.
5. No data from the watch (activity, location, health) is collected.

This policy applies to **all** IQDI notifications (phone, watch, or car mirroring), because the OS can mirror them without IQDI knowing.

## 4. Platform limitations

- The watch cannot hold credentials securely in the way the phone's hardware-backed keystore can, at least without platform-specific work. **NOT VERIFIED** per device.
- The small screen makes reading consent information impractical, so consent stays on the phone.
- Users may wear a watch they have not unlocked or authenticated. Whether a watch stays unlocked while worn varies by platform and settings.

## 5. Future API / adapter requirements

- A `NotificationAdapter` in the native apps (see `CROSS_PLATFORM_CAPABILITIES.md`) with a payload schema that **cannot** carry personal data:
  `{ kind: 'REQUEST_NEW' | 'REQUEST_EXPIRING' | 'DECISION_RECORDED', ref: opaque }`.
- A server push channel (does not exist today; polling only).
- Deep link from the watch notification to the phone's request review.

## 6. Security prerequisites (before any watch work)

1. Native mobile apps with authenticated sessions and device binding.
2. A push service with signed, minimal payloads.
3. A threat model covering a lost or borrowed watch, shoulder-surfing, and mirrored notifications.
4. Government approval of the notification content.
5. An accessibility review on the watch (VoiceOver, TalkBack on Wear).

No conceptual watch images are included in the code or presented as working features.
