# IQDID Secret Scanner — policy v1

This is original project code using Node built-ins only. No third-party scanning engine, dependency install, license change, Node version change, or G1 dependency change is introduced. Node 22 is the existing baseline; Windows CI pins 22.22.2. Local verification also records the actual available Node version.

## Entry points

```text
node tools/secret-scanner.mjs --staged
node tools/secret-scanner.mjs --all-index
node tools/secret-scanner.mjs --staged --base <full-commit-SHA>
node tools/secret-scanner.mjs --all-index --path "path with spaces.txt"
```

The canonical CLI is a safe process boundary around the engine. It discards engine stderr, validates the report schema, emits only sanitized path/rule/line/error-code metadata, and returns BLOCKED if the engine crashes, emits malformed output, or disagrees with its exit status. Invoke this CLI rather than the internal engine directly.

Exit 0 = PASS; 1 = FAIL (findings); 2 = BLOCKED (incomplete scan, unsupported input, invalid policy, missing tool/object, crash). Any BLOCKED result rejects a commit/CI job. If findings and unreadable content coexist, BLOCKED takes priority because coverage is incomplete.

The scanner does not write files or modify the index. Reports go to stdout; callers may capture them in a new evidence file. Git commands run without optional locks, external diff drivers or text conversion. It reads stage-zero object IDs with NUL-separated Git commands and obtains blob bytes using `git cat-file`; it never reads the working-tree file being inspected. Deleted paths are omitted, renames use the new indexed entry, unmerged/symlink/submodule entries are BLOCKED. Index snapshots must match before and after scanning.

The policy is also read from the index, not the working tree. It must be staged even in a new repository. Working-tree edits cannot relax the staged policy. The policy schema rejects arbitrary exceptions, missing mandatory rule IDs, wider TEST patterns, and excessive resource limits. Core patterns are maintained in `tools/lib/secret-scanner-engine.mjs` with regression tests; policy changes require code review, not a blanket ignore list.

## Rules and deliberate boundaries

- PRIVATE_KEY: private PEM, RSA/EC/DSA, OpenSSH, encrypted PEM and armored PGP private-key headers. A private-key header is rejected even if its body is damaged or labelled TEST.
- PRIVATE_JWK: recursive JSON JWK/JWKS for RSA/EC/OKP/oct, including private d/p/q/dp/dq/qi/oth and symmetric oct k. Bounded JS/YAML/invalid-JSON snippets are also checked. Public-only JWK and public PEM are allowed. Obfuscated or future formats are not guaranteed to be recognized.
- KNOWN_TOKEN: GitHub token families, AWS access-key IDs, Slack token families and Stripe live-secret prefixes. This is an explicit pattern set, not universal credential discovery.
- SECRET_ASSIGNMENT: quoted credential-like values (at least 8 characters) or unquoted values (at least 12) assigned to password/passwd/api_key/access_token/client_secret/private_key/secret. Only precise placeholder forms are allowed: asterisks, bracketed placeholders, environment expressions, REPLACE_ME/CHANGEME variants and YOUR_* placeholders. TEST alone is not a placeholder.
- SENSITIVE_FILE: active `.env`/`.env.*` files; `.env.example` is restricted to comments and placeholder assignments. Named SSH private files are rejected when nonempty and not public PEM. Nonempty p12/pfx/jks/keystore containers are forbidden; `.pem`/`.key` alone is not treated as proof of private content.
- PII_IDENTIFIER: defined national/civil/citizen ID and passport/document number fields with at least six digits, including Arabic/Persian digits and common separators. Bare dates/UUIDs/numbers outside these field contexts are not blanket-blocked.
- PII_CONTACT: literal email/phone/mobile fields; test/example/invalid email domains are reserved fixtures. Names and dates alone cannot reliably distinguish real citizens from prose.

The only citizen-ID allowance is an exact `national_id`/`nationalId` value matching `TEST-` followed by twelve decimal digits. It applies to that value only: a key, token, unrelated real-looking identifier or contact in the same file is still rejected. No key/token exception is supported.

## Binary files, archives and limits

UTF-8 and BOM-marked UTF-16 text are inspected. Unsupported binary input is BLOCKED, not skipped. Standard ZIP stored/deflate entries are inspected, including visible metadata; CRC/declared sizes, local/central name consistency, descriptor/range coverage and path safety are checked. No orphan entries, encryption, ZIP64, symlink entries, traversal, duplicate members or unsupported compression are accepted. Archives are not extracted or executed.

Default hard ceilings: 2 MiB per blob/member, 32 MiB expanded archive data, 2,000 cumulative members, and two archive levels. Oversized/unsupported input fails closed and may require a separately reviewed decoder or policy change. Historical TASK-1 ZIPs are scanned, not globally exempted. This protection cannot guarantee detection of encoded, encrypted, novel, assembled or otherwise obfuscated secrets.

## Local pre-commit installation

On Linux, or Windows PowerShell 5.1 with Git for Windows and Node available:

```text
node tools/install-secret-hook.mjs .
```

The installer changes only repository-local `core.hooksPath`, sets the executable bit on Linux, and refuses to overwrite an effective existing hooksPath or an existing native hook. It does not change global Git settings. Git for Windows supplies the shell needed by the extensionless hook. Review any installer BLOCKED result before changing existing hooks.

The hook scans the staged index; a missing Node is BLOCKED. The hook is not installed automatically by cloning, and can be bypassed or modified locally (`--no-verify`, changed hooksPath/code). Tests verify real rejected and accepted commits. Git commit may independently refresh index metadata; direct scanner tests assert exact index bytes are unchanged, while hook tests assert indexed entries are unchanged.

## CI and enforcement limits

The independent workflow runs on PRs and the TASK-2 branch, on Ubuntu and Windows PowerShell 5.1, with read-only contents permission, no project secrets or write token, pinned action commits and no npm installation. It scans the complete checkout index and executes synthetic-fixture integration tests. It uses `pull_request`, never privileged `pull_request_target`.

PR-supplied code/workflows may be modified by a contributor; this workflow alone is not tamper-proof. Code review and approved required-status/branch-protection settings are a separate enforcement step. No administrative settings or branch protections are changed by TASK-2. This is a bounded defense, not a claim that all secrets or all real PII can be detected.
