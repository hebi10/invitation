# Copilot Instructions

Follow AGENTS.md as the primary project guide.
If there is any conflict, AGENTS.md takes precedence.

## Project context
- Mobile wedding invitation and memory page service.
- Next.js App Router, TypeScript, Firebase Auth, Firestore, Firebase Storage.
- Three user flows: public invitation pages, admin pages, client page-editor.

## Inline completion rules
- Follow the naming conventions already used in the same file and directory.
- Use `@/` alias for all imports (e.g., `@/services`, `@/utils`).
- When generating a new component, mirror the structure of existing components in the same `_components/` directory.
- Variable and function names: English. UI strings, comments, and user-facing text: Korean.
- Do not auto-generate comments unless the logic is non-obvious.

## Copilot Chat rules
- Respond in Korean for explanations and summaries.
- Prefer minimal and safe changes over broad refactoring.
- Respect server/client component boundaries (`'use client'` directive).
- When suggesting a change, mention scope and risk.
- When reporting completion, summarize:
  1. Change summary
  2. Impact scope
  3. Validation status
  4. Remaining risk

## Frontend rules
- Handle loading, error, and empty states explicitly.
- Consider responsive layout impacts before changing UI.
- Use semantic markup and accessible UI patterns (ARIA roles, labels).

## Data and API rules
- Preserve Firestore-first + fallback-compatible behavior.
- Do not break API response shapes without explicit reason.
- Admin uploads go directly to Firebase Storage via client SDK.
- Client editor uploads go through API routes using Admin SDK on the server.
- Never expose server-only env vars (only `NEXT_PUBLIC_` prefixed vars are safe for client code).
- Be careful with migration-period guestbooks compatibility.
