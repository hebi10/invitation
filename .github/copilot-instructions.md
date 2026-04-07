# Copilot Instructions

Follow AGENTS.md as the primary project guide.
If there is any conflict, AGENTS.md takes precedence.

## Project context
- This project is a mobile wedding invitation and memory page service.
- It uses Next.js App Router, TypeScript, Firebase Auth, Firestore, and Firebase Storage.
- Main user flows include public invitation pages, admin pages, and client page-editor flows.

## Coding rules
- Respond in Korean for explanations and summaries.
- Prefer minimal and safe changes.
- Do not refactor broadly unless explicitly requested.
- Preserve existing behavior first.
- Keep UI logic, service logic, and server-only logic separated.
- Do not add libraries unless necessary.
- Prefer readable code over clever abstractions.
- Use semantic markup and accessible UI patterns.
- Use HTML/CSS/JS separated output only for publishing deliverables.
- For codebase edits, answer in the target file format directly.

## Frontend rules
- Respect server/client component boundaries.
- Handle loading, error, and empty states.
- Consider responsive layout impacts before changing UI.
- Keep naming explicit and role-oriented.

## Data and API rules
- Preserve Firestore-first and fallback-compatible behavior.
- Do not break API response shapes without explicit reason.
- Keep auth/session flows strict.
- Never expose secrets or sensitive env values.
- Be careful with migration-period guestbooks compatibility.

## Validation rules
- Prefer actual package.json scripts for lint, build, and test checks.
- If there is no typecheck script, confirm whether `npx tsc --noEmit` is valid before suggesting it.
- Mention what was verified and what still needs manual confirmation.

## Output rules
- Provide copy-friendly code.
- Keep comments minimal.
- When suggesting a change, mention scope and risk.
- When reporting completion, summarize:
  - change summary
  - impact scope
  - validation status
  - remaining risk