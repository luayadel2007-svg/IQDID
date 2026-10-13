# TASK3C independent conformance review

Reviewer: independent task3_independent_review agent. Review and execution: 2026-10-12 UTC. Scope: F01–F06 compatibility prototype only; no services, runtime policy activation, dependency or SDK edits performed by this reviewer.

## Executed result

**ADAPTER_GUARD: PASS — 42/42 cases; process exit 0.** Actual IQDID HTTP services remain **NOT RUN**. This result does not establish G1a/G1b PASS, complete DR13 interoperability, or conformance of the unchanged SDK.

Fresh evidence: `evidence/task3/task3c-20261012T235205Z/independent-review/`. `command.json` records exact argv, working directory, SDK environment override, process exit and source SHA-256. `stdout.log`, `stderr.log` and `adapter-run/summary.json` preserve the independent execution.

## Critical source review

- F01: proof algorithm cardinality is checked before SDK schema normalization, including unknown proof types. The guard intentionally does not impose one universal algorithm identifier type; actual metadata parsing remains delegated to the pinned SDK. This is a targeted cardinality supplement, not a complete proof-format validator.
- F02: the proof/binding dependency is checked in both directions. Omitting both optional fields remains accepted. No project key-binding policy is activated.
- F03: display arrays are nonempty when supplied and entries require a string name. Optional display or credential metadata omission remains accepted. Complete display/locale extension validation is outside the compensation claim.
- F04: raw offer queries reject conflicting value/reference parameters, duplicate known parameters, missing/empty inputs and non-HTTPS references before invoking SDK resolution. Positive by-value and by-reference paths exercise the pinned SDK; delegate errors remain errors. This is not complete URL or network destination safety validation.
- F05: input and output immediate credential-array boundaries are guarded. `additionalPayload` overriding credentials with an empty array is rejected before SDK invocation. Both string and object representations remain accepted. SDK output `credentials: undefined` is treated as omitted, preserving valid deferred responses. Deferred positive interval and immediate/deferred conflicts are delegated to and exercised against the SDK. No universal credential-format cryptographic validation is claimed.
- F06: correction targets only the selected HTTPS request_uri POST. Form encoding round-trips caller-supplied Unicode metadata and special-character nonce values. Both, metadata-only, nonce-only and neither cases preserve optionality. Content type and Accept are checked; unrelated fetch operations and SDK response processing are delegated unchanged. Invalid request objects and transport failures remain rejected. This verifies transport serialization with mock responses, not a verified request-object roundtrip, issuer trust or HTTP endpoint behavior.

## Previously found harness issue and correction

The earlier DR13 deferred fixture lacked required positive interval. In this reviewed adapter suite, the deferred fixture includes interval 10 and is accepted by the SDK. The earlier adapter attempt rejected SDK-generated `credentials: undefined`; the present guard correctly treats that property as omitted. The fresh 42/42 run is separate evidence and does not replace or relabel the historical failed attempt.

## Residual risks and acceptance

No blocking defect was identified in the six compensation boundaries exercised here. The module is not integrated into any service; a future integration must prove that every relevant SDK entry point passes through the adapter. Direct SDK calls can bypass its guards. It is not an exhaustive metadata, URL, credential, cryptographic or protocol validator. No persistent storage, authorization, concurrency, TTL, live HTTP or complete interoperability proof follows from these tests.

The six historical raw SDK discrepancies remain findings against those tested SDK boundaries. Adapter compensation does not justify changing their historical FAIL records to PASS. Accept the compatibility prototype for engineering review within F01–F06 scope; keep owner policy approvals and G1a/G1b gate judgments independent.
