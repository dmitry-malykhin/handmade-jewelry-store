# Pre-launch audit — process + rules

This directory holds the pre-launch multi-phase audit of the store. Each phase
has a parent GitHub issue and a detailed checklist here. Findings during a
phase become child issues; the phase parent stays open until every child is
either fixed or explicitly deferred.

## RULE 0 — Every issue on the board MUST have these fields filled

Not optional, not "later" — the moment an issue is created it must have all
of the following. Missing any of them = the finding is not correctly filed
and the audit rules are violated.

| Field         | Where           | Required value |
| ------------- | --------------- | -------------- |
| **Assignee**  | issue sidebar   | `dmitry-malykhin` (always — every audit finding + task) |
| **Labels**    | issue sidebar   | `type: frontend / backend / infra`, `kind: bug / feature / tech-debt`, `priority: high / medium / low`, `sp:1 / sp:2 / sp:3 / sp:5`, optionally `block: launch-prep` |
| **Project**   | issue sidebar   | added to `Handmade Jewelry Store — Roadmap` |
| **Status**    | project field   | `Planned` (or `In progress` when picked up) |
| **Priority**  | project field   | `P0` for `priority: high`, `P1` for `medium`, `P2` for `low` |
| **Size**      | project field   | `S` for sp:1, `M` for sp:2, `L` for sp:3, `XL` for sp:5 |
| **Estimate**  | project field   | integer equal to the sp label (1, 2, 3, 5) |

The `Priority` label and the `Priority` project field are separate storage
locations — you must fill both, kept in sync via the mapping above.

There is a helper script — `scripts/gh/backfill-project-fields.sh` — that
picks up any open issue owned by the user, reads its labels, and sets the
matching Project fields + assignee. Run it after creating a batch of issues
to fix anything you forgot.

## Phases (run sequentially)

| # | Focus | Checklist | Parent issue |
| - | ----- | --------- | ------------ |
| 0 | Automated smoke — everything boots, all routes return, all tests pass | [phase-0-smoke.md](./phase-0-smoke.md) | to be filed |
| 1 | Technical audit — dead code, coverage gaps, bundle size, security | [phase-1-technical.md](./phase-1-technical.md) | to be filed |
| 2 | UX / Design walkthrough — every flow, mobile + desktop, light + dark | [phase-2-ux-design.md](./phase-2-ux-design.md) | to be filed |
| 3 | Product / PM + Sales / Marketing — funnel, SEO, analytics, emails, trust | [phase-3-product-sales.md](./phase-3-product-sales.md) | to be filed |

## Rules of engagement

**Sequential, not parallel.** Phase N+1 does not start until every finding in
Phase N is closed (fixed or explicitly deferred with a "wontfix" reason
recorded in the issue).

**Every finding becomes an issue immediately** — not a note, not a TODO in the
checklist. Filed the moment it is spotted, so nothing is forgotten by the time
we finish the phase.

**Every finding-issue must be filled per project rules** (see
[docs/03_CODE_RULES](../03_CODE_RULES.docx) and CLAUDE.md). Non-negotiable
fields:

- **Title**: `type: short description` — e.g. `fix: cart total ignores VAT`,
  `test: missing coverage for admin category delete`, `refactor: extract 800-line
  admin-products-table into per-column components`.
- **Labels** (all required):
  - `type: frontend` / `type: backend` / `type: infra`
  - `kind: bug` / `kind: feature` / `kind: tech-debt`
  - `priority: high` / `priority: medium` / `priority: low`
  - `sp:1` / `sp:2` / `sp:3` / `sp:5` (Fibonacci; use 5 sparingly)
  - `block: launch-prep` — add if this must ship before public launch.
- **Project**: added to `Handmade Jewelry Store — Roadmap`, Status = `Planned`.
- **Body sections** (all required):
  - `## Why` — user-visible impact or engineering risk. One paragraph, concrete.
  - `## Where` — file:line references or URL where the bug/gap lives.
  - `## Steps to reproduce` (for bugs) — numbered, deterministic.
  - `## Expected vs actual` (for bugs) — one sentence each.
  - `## Fix hypothesis` — root cause if immediately visible; otherwise
    "unknown — needs investigation".
  - `## Acceptance` — bulleted checklist that will be verified before merge.
  - `## Discovered during` — link to the phase parent issue.

**Missing test → separate issue.** If the audit finds a code path with no test
coverage, file it as `test:` with the same rules. Do not skip it because "the
code seems to work".

**Broken test → bug issue.** If a test asserts wrong behavior (passes but
should not), file as `fix:` — same rules.

**After the phase**: pick the finding-issues one by one, fix each, PR + merge,
close the finding, tick it off in the phase parent. Only when the parent's
checklist is 100% ticked does the next phase begin.

## Handoff

At any point another session (or contributor) can pick this up: read
`README.md` → the phase `.md` → the phase parent issue → the open child issues.
Everything needed to continue is on GitHub or in this directory.
