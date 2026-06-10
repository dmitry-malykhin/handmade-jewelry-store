# Security advisories — accepted risks

`pnpm audit` will continue to report these. Each one was evaluated, found
unreachable from runtime or impossible to patch without a major-version
ecosystem migration, and is **accepted** with the justification below.

Re-evaluate when:

- The upstream pins are bumped (we can drop the entry)
- A reachable exploit is reported (we patch immediately, not on schedule)
- The relevant migration (NestJS 11, Express 5, vitest 5) is on the roadmap

CI keeps `pnpm audit --audit-level=critical` as the gate: anything **critical**
fails the PR. Anything else lands here for review.

---

## High

### path-to-regexp (ReDoS via specific URL patterns)

Path: `apps/api > @nestjs/platform-express > express@4 > path-to-regexp@0.1.x`

- **Reachable**: yes, all API endpoints
- **Patched in**: 8.x
- **Why accepted**: Express 4 hard-pins `path-to-regexp@0.1.x`. Overriding to 8.x changes the route-matching syntax (`(.*)` → `*all`, no more `:param?`) and breaks every NestJS controller decorator. The pragmatic fix is Express 5 + NestJS 11.
- **Mitigation**: NestJS validates each route at module load; any pattern shipping with our app is normal, not user-supplied. The DoS vector requires user-controlled route registration, which we don't expose.
- **Followup**: tracked under the NestJS 11 migration (post-launch).

### vite (`server.fs.deny` bypass, dev WebSocket file read)

Path: `apps/web > @vitejs/plugin-react > vite@8.0.1` (and `vitest@4 > vite`)

- **Reachable**: dev-only (vitest harness and `vite dev` for component playground)
- **Patched in**: 8.0.16
- **Why accepted**: `vitest@4.1` and `@vitest/mocker@4.1` pin vite to a specific minor; `pnpm.overrides` cannot lift it without breaking the vitest plugin handshake. The override was tried and rolled back.
- **Mitigation**: dev server runs only on the contributor's loopback (`localhost:5173`) and is never exposed publicly. The CVE requires the attacker to reach the dev WebSocket.
- **Followup**: upgrade vitest to a release that floats vite ≥ 8.0.16 (track upstream).

### glob CLI (command injection via `-c/--cmd`)

Path: `apps/api > @nestjs/cli > glob@10.4.5`

- **Reachable**: dev-only — `@nestjs/cli` is used for code generation (`nest g …`), never bundled in production
- **Patched in**: 11.x (major)
- **Why accepted**: NestJS CLI 10 pins glob 10.x; upgrading to NestJS CLI 11 is a major ecosystem move (NestJS 11 itself).
- **Mitigation**: the exploit requires running `glob -c` against untrusted input. NestJS CLI never does that.

## Moderate

### @nestjs/core (improper neutralization of special elements in output)

Path: direct dep, version 10.4.22

- **Reachable**: in theory yes — covers response sanitization
- **Patched in**: 11.x
- **Why accepted**: We are on the latest 10.4.x. Jumping to NestJS 11 is a major migration (CacheModule, decorator changes, Express 5 default). Out of scope for the launch PR.
- **Mitigation**: API responses go through our own DTO mappers that strip sensitive fields. The CVE concerns NestJS-emitted error pages, which we replace with a Sentry-instrumented filter.
- **Followup**: NestJS 11 migration tracked separately.

### file-type (infinite loop / decompression bomb)

Path: `apps/api > @nestjs/common > file-type@20.4.1`

- **Reachable**: no — `file-type` is loaded by `@nestjs/common` but never invoked. We do not accept file uploads (`multer`, also transitive, is also dead code — see grep in #300 audit).
- **Patched in**: 22.x (major)
- **Why accepted**: not in any execution path.

### vite (path traversal in `.map` handling)

Path: same as the high entry above. Same justification.

### uuid (missing buffer bounds check in v3/v5/v6 buf path)

Path: `apps/api > jest-allure2-reporter > uuid@8.3.2`

- **Reachable**: dev/test only — Allure reporter generates UUIDs for test fixtures.
- **Patched in**: 14.x (major)
- **Why accepted**: never runs in production. Major bump risks breaking the reporter.
