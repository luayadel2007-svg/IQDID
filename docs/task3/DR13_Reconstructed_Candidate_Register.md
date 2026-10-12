# IQDID — DR-13 Reconstructed Candidate Register

**Status:** SOURCE-EXTRACTED / NOT APPROVED / NOT VERIFIED AGAINST STANDARDS  
**Prepared:** 13 October 2026  
**Source:** `Phase_2_Consolidated_Architecture_v1.1.md`, Chapter 6, reproducing original `API_Contracts_v1.0` without substantive changes.  
**Method:** Extract explicit `[غ]` markers within the original API-contract chapter; distinguish actual requirements from the legend, general warning, duplicated references, and decision index. The historical claim of “17 items” is **not substantiated** by 17 distinct enumerated rows in the recovered file.

## Candidate items directly traceable to `[غ]`

| Reconstructed ID | Original section | Source line | Original unresolved subject (paraphrased, not a standards verdict) | Required review |
|---|---|---:|---|---|
| DR13-C01 | STD-02, issuer metadata response | 1996 | Literal field names for supported proof types, signing algorithms, and presentation methods | OpenID4VCI version and metadata schema |
| DR13-C02 | STD-03, offer retrieval path | 2006 | Credential offer QR URI scheme and `credential_offer_uri` parameter name | OpenID4VCI credential offer profile |
| DR13-C03 | STD-03, credential offer response | 2009 | Literal field name for credential configuration IDs in an offer | OpenID4VCI credential offer schema |
| DR13-C04 | STD-04, token endpoint description | 2019 | Authorization-server discovery and metadata | OAuth Authorization Server Metadata and OpenID4VCI |
| DR13-C05 | STD-04, token response | 2022 | Exact token response fields: access token, token type, lifetime | OAuth token endpoint / OpenID4VCI |
| DR13-C06 | STD-06, proof JWT request | 2047 | `iat` requirement and semantics in proof of possession | OpenID4VCI and relevant JWT proof rules |
| DR13-C07 | STD-06, credential response | 2048 | Literal `credentials` / `credential` field names and response structure | OpenID4VCI credential response |
| DR13-C08 | STD-06, error response | 2050 | HTTP 401 status for invalid access tokens | OAuth bearer token error handling and profile |
| DR13-C09 | STD-07, notification response | 2061 | Exact HTTP 204 response status with no body | OpenID4VCI notification endpoint |
| DR13-C10 | STD-07, notification errors | 2063 | Literal error code for notification failures | OpenID4VCI notification endpoint |
| DR13-C11 | STD-09, authorization request via POST | 2086 | Literal field name of wallet metadata accompanying `wallet_nonce` | OpenID4VP request URI POST profile |
| DR13-C12 | STD-09, signed request policy | 2088 | Whether the `redirect_uri:` client identifier scheme supports signed requests as assumed | OpenID4VP client identifier prefixes and request object rules |

## Additional `[غ]` references that do not establish separate historical items

| Source line | Context | Treatment |
|---:|---|---|
| 2394 | `STD-04` OAuth `invalid_request` / `invalid_grant` and special tx_code error | Cross-reference/additional detail for C04/C05; review as sub-question, do not silently count as unique historical item |
| 2444 | `iat` for credential proof and 60-second TTL | Cross-reference of C06; review independently for timing policy, do not count twice |

## Non-item marker occurrences

- Line 1891: definition of the `[غ]` marker.
- Line 1974: general instruction to verify unconfirmed protocol claims.
- Line 2513: AP-02 register entry instructing review of `[غ]` items.

## Reconstruction caveats

1. The recovered source visibly contains 17 `[غ]` occurrences in Chapter 6 over lines 1860–2550. Subtracting three general/index occurrences and two cross-references yields 12 primary locations, **not a verified original list of 17 standalone fields**.
2. One source row can mention several distinct fields or issues (C01, C05, C07). Do **not** split them solely to force 17 without a traceable authoritative inventory.
3. This register extracts what the author marked as unverified; it **does not** claim these claims are false or correct under any standard.
4. The historical original DR-13 enumerated 17-item checklist, if it exists elsewhere, must be compared item by item and the register amended with source provenance. Do not claim to have located it.
5. The project's pinned standard versions, as approved, must be applied; do not silently substitute newer revisions. The linked `OD-01…OD-09` of TASK-3 are separate from identically numbered Phase-2 decisions.
6. DR-13 / AC-G1a-6 remains PARTIAL or BLOCKED pending primary specification verification, coverage reconciliation, and owner sign-off.

## Next action for Claude or Work

Review the twelve C-items and the two cross-references against the project-pinned normative standard text. Record per item: exact source quotation (short), standard identifier/version/section, normative vs project choice, observed claim, conformity verdict, required fix, test case ID, evidence path, and reviewer. Separately search for the historical 17-entry list and reconcile **without inventing missing items**. Generate a decision-ready traceability matrix; leave G1a unpassed until its acceptance criteria are independently met.
