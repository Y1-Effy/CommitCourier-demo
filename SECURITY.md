# Security Policy

This repository is the **demo site** for CommitCourier — a consumer that installs `commitcourier`
from npm and runs it for real at <https://commitcourier-demo.xvps.jp>. The library itself lives in a
[separate repository](https://github.com/Y1-Effy/CommitCourier).

That split decides where to report.

## Where to report

**A vulnerability in the `commitcourier` library** — the outbox, the dispatcher, signing, the SSRF
guard, the state machine, anything shipped in the npm package:

→ <https://github.com/Y1-Effy/CommitCourier/security/advisories/new>

**A vulnerability in this demo site or this repository** — the live site at
`commitcourier-demo.xvps.jp`, its demo API, its self-receiver, or the deployment:

→ <https://github.com/Y1-Effy/CommitCourier-demo/security/advisories/new>

Please use the private advisory form rather than a public issue or pull request, so a fix can land
before the details are public. Expect a reply within a few business days. There is no formal SLA and
no bug bounty.

## In scope for this repo

The demo is a public site that anyone can drive, so its guards are the interesting part. These are
real findings:

- **Escaping the fixed delivery target.** Every enqueue is hardcoded to this site's own receiver
  (`server/routes.ts`). Visitor input never chooses a delivery URL — that is what stops the demo
  from being turned into an SSRF or spam relay. Any path that makes it deliver somewhere else is the
  most serious thing you can find here.
- **Bypassing the SSRF guard.** It runs with `blockPrivateRanges: true` and an allowlist containing
  only this site's own receiver host (`server/courier.ts`).
- **Bypassing the write rate limit.** 40 requests per 60 seconds on the write endpoints
  (`server/routes.ts`).
- **Forging a delivery past signature verification** at the self-receiver (`server/receiver.ts`).

## Not vulnerabilities

These look alarming and are deliberate. Reporting them tells us nothing we don't already know:

- **`unsafeAllowPlaintextSecrets: true`** (`server/courier.ts`). The demo stores signing secrets in
  plaintext on purpose, and says so in the UI and in the README. A production integration passes
  `cipher: createAesGcmCipher(key)` instead — the Integrate page shows that form.
- **The signing secret is committed to this repo** (`server/config.ts`, `.env.example`). The demo
  signs webhooks it sends to itself, so there is no secret to keep. It is a fixture, not a leak.
- **There is an endpoint that targets `169.254.169.254`** (the cloud metadata IP, in
  `server/routes.ts`). That is the SSRF demo: it exists to show the guard blocking it. Being blocked
  is the correct outcome, and that is what the page reports.
- **Retries are tuned absurdly short** — 6 attempts, 1s base backoff, 5s delivery timeout
  (`server/courier.ts`). That is so visitors can watch retry → DLQ happen in seconds. Production
  values are not these.
- **Demo data is world-writable by design.** Anyone can enqueue, roll back, break the receiver, and
  replay the DLQ. That is the demo.
