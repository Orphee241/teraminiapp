# TeraDoc CV and document service Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add TeraDoc as a secure document-creation service inside the Telegram Mini App, starting with beautiful professional CVs and extending to letters, contracts, complaints, motivation letters, and administrative documents.

**Architecture:** Keep the existing single Next.js deployment and modular monolith. Add a `teradoc` module with an allowlisted template catalog, validated CV/document payloads, owner-scoped persistence, and a rendering boundary. The first release is a complete CV vertical slice; later document types reuse the same editor, draft, validation, and export contracts without mixing them with quote/invoice billing.

**Design direction:** Recruiter-first and ATS-conscious: primarily single-column templates, selectable text, standard section headings, restrained black/gray typography with one subtle accent, generous whitespace, no decorative gradients, no fake skill bars, and no information embedded only in images. Offer a refined two-column template only as an explicit creative option, with an ATS warning.

**Tech Stack:** Existing Next.js App Router, TypeScript, Telegram `initData` authentication, Turso/libSQL module repositories, existing PDF/document service boundary where suitable, and the current Terainterface dark UI shell.

---

## Scope and acceptance criteria

- TeraDoc appears as a first-class service in Services with a clear description.
- A user can choose among at least three distinct CV templates and preview the layout before entering data.
- A validated multi-step form captures identity, summary, experience, education, skills, languages, certifications, and optional links/photo.
- Drafts and generated documents are owner-scoped; browser-supplied owner IDs, template IDs, status, price, and storage keys are never authoritative.
- CV export produces a real text-based PDF and preserves selectable text; the service does not alter the existing quote/invoice workflow.
- The UI remains polished on Telegram mobile and desktop, with no gradients or excessive color.
- Tests cover template allowlisting, payload validation, owner isolation, rendering, and the complete form flow.
- Full test suite, TypeScript, build, diff check, deployment, and public smoke test pass before release.

## Template catalog

1. **TeraDoc Essential** — single column, black/charcoal text, one muted burgundy rule; safest ATS option.
2. **TeraDoc Editorial** — single column, stronger typographic hierarchy, compact metadata row, slate accent; suited to experienced professionals.
3. **TeraDoc Executive** — restrained two-column layout with real text and no charts; label clearly as “créatif — compatibilité ATS à vérifier”.

Use the same semantic content model for every template. Never let a template define or accept arbitrary HTML/CSS from the client.

---

## Implementation tasks

### Task 1: Establish the module boundary and catalog tests

**Files:**
- Create: `src/modules/teradoc/templates.ts`
- Create: `src/modules/teradoc/cv-schema.ts`
- Create: `src/modules/teradoc/server/repository.ts`
- Test: `src/app/components/teradoc-cv-schema.test.ts`

Define template IDs, metadata, section limits, and a canonical CV payload. Reject unknown templates, oversized fields, invalid URLs, malformed dates, and unbounded arrays. Derive the owner from verified Telegram authentication in server routes.

Run: `npm test -- src/app/components/teradoc-cv-schema.test.ts`

### Task 2: Add owner-scoped draft persistence

**Files:**
- Modify: `src/lib/storage.ts` only for the idempotent schema migration seam
- Modify: `src/modules/teradoc/server/repository.ts`
- Create: `src/app/api/teradoc/cv/route.ts`
- Create: `src/app/api/teradoc/cv/[id]/route.ts`
- Test: `src/app/components/teradoc-cv-access.test.ts`

Persist drafts and generated-document metadata in dedicated TeraDoc tables. Use parameterized queries, server-derived `owner_telegram_id`, bounded JSON bodies, same-origin protection, persistent rate limiting, and strict owner/staff authorization. Never accept a client-selected storage key, price, or status.

Run: `npm test -- src/app/components/teradoc-cv-access.test.ts`

### Task 3: Build template selection and CV form UX

**Files:**
- Create: `src/app/components/TeraDocCenter.tsx`
- Create: `src/app/components/TeraDocCenter.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

Add the TeraDoc service card, template gallery, live preview, mobile-friendly stepper, repeatable experience/education rows, accessible labels, draft save, and clear progress/error states. Keep the current Telegram back-button and safe-area behavior. The template selector must show ATS guidance without technical clutter.

Run: `npm test -- src/app/components/TeraDocCenter.test.tsx`

### Task 4: Add deterministic PDF rendering

**Files:**
- Create: `src/modules/teradoc/server/render-cv.ts`
- Create: `src/app/api/teradoc/cv/[id]/pdf/route.ts`
- Test: `src/app/components/teradoc-rendering.test.ts`

Render only server-validated semantic data through fixed templates. Prefer the existing document/PDF service if its contract supports TeraDoc; otherwise add a dedicated renderer without sharing invoice business rules. Verify PDF header, page count bounds, selectable text, page-break behavior, and no user-controlled path or markup injection.

Run: `npm test -- src/app/components/teradoc-rendering.test.ts`

### Task 5: Add reusable non-CV document types

**Files:**
- Create: `src/modules/teradoc/document-types.ts`
- Modify: `src/app/components/TeraDocCenter.tsx`
- Modify: `src/app/api/teradoc/*`
- Test: `src/app/components/teradoc-document-types.test.ts`

Add the service catalog for complaint, motivation letter, contract, and administrative document. Start with structured templates and user-entered content; keep AI-assisted drafting optional and server-mediated through Michelle only after the contract, privacy, and review confirmation are defined. Never present generated legal text as legal advice; show a review notice.

### Task 6: Full verification and deployment

Run:

```bash
npm test
npx tsc --noEmit
npm run build
npm audit --omit=dev
 git diff --check
```

Review the diff for secrets and direct storage imports from API routes. Commit only the TeraDoc slice, push `b2-crud`, trigger Dokploy, select the newest deployment by `createdAt`, verify two active tasks, then smoke-test Telegram rendering, template selection, draft ownership, and PDF download through the public domain.

---

## Product rules

- TeraDoc is a separate service and billing namespace from Devis/Facture; do not consume invoice credits or mix archives.
- The first CV release should be usable without AI. AI can assist wording later, but the user remains the author and must confirm the result.
- Photo is optional and never required. If present, store it through the existing media boundary and render it only when the selected template supports it.
- Use French labels first, with future localization-ready keys.
- Avoid claiming ATS compatibility as absolute; label the Essential template “optimisé pour une lecture ATS” and explain that employer systems vary.
- Legal/administrative documents require an explicit review disclaimer and should not imply professional legal advice.
