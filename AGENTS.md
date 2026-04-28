# AGENTS.md

## Purpose

This file defines how the coding agent must behave when working on this project.

The goals are:
- fast iteration
- predictable structure
- minimal breakage
- reusable patterns across projects

---

## Core Principles

1. Build in small, controlled steps.
2. Do not guess requirements — read planning files first.
3. Prefer simple, explicit code over abstraction.
4. Complete one working vertical slice before expanding.
5. Keep frontend, backend, and data layers clearly separated.

---

## Required Reading Order

Before writing any code, the agent MUST read:

1. project_brief.md
2. build_plan.md
3. database_plan.md
4. api_plan.md
5. ui_plan.md

If any of these are missing or incomplete:
- STOP
- Ask for clarification

---

## Execution Workflow

The agent must follow this loop:

1. Identify current phase from `build_plan.md`
2. Propose:
   - files to create/modify
   - dependencies required
   - expected outcome
3. Wait for confirmation (unless explicitly told to proceed)
4. Implement changes
5. Explain:
   - what was changed
   - why
   - what to test
6. Update `build_plan.md` progress notes

---

## Planning Discipline

The agent must NOT start coding immediately.

Before any implementation:
1. Confirm current phase
2. List affected files
3. Describe expected result

If unclear:
- Stop
- Ask
- Do not assume

---

## Change Scope Control

Each step must be limited in scope.

Rules:
- Do not modify more than 3–5 files per step unless necessary
- Do not mix concerns (UI + API + DB) in one step unless required
- Prefer incremental changes over large rewrites

If a task is large:
- Break it into smaller steps
- Execute sequentially

---

## File Safety

- Never delete working code without permission
- Never rewrite entire files unless necessary
- Never change schema without updating `database_plan.md`
- Never hard-code secrets or credentials
- Always use `.env` files

---

## Architecture Rules

### Frontend

- React + TypeScript only
- Use functional components
- Use React Router
- Centralize API calls in `src/api.ts`
- Keep components small and reusable
- Avoid complex state structures

### Backend (Cloudflare Worker)

- All routes under `/api/*`
- Use modular route files in `/routes`
- Keep handlers small and focused
- Use helper/middleware for shared logic
- Do NOT use Express or Node server patterns

### Database (D1)

- Use explicit SQL files in `/schema`
- No hidden schema changes
- Every change must be a new migration
- Keep schema readable and simple

### Storage (R2)

- Only use if required
- Access only through `storage/index.ts`
- Do not mix storage logic into business logic

---

## Auth & RBAC Rules

- Use JWT stored in cookies
- All protected routes must:
  1. verify authentication
  2. check role

Roles:
- admin → full access
- editor → create/edit
- viewer → read-only

Frontend must:
- hide restricted menu items
- block unauthorized routes

---

## Standard Patterns

### API Response Format

All API responses must follow:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

### Frontend API Access

- All HTTP calls go through `src/api.ts`
- Do NOT use fetch directly in components

### Component Pattern

- Keep components small and focused
- Separate UI, logic, and data fetching

### Form Pattern

- Validate inputs before submission
- Show clear validation errors
- Handle loading and success states

---

## Error Handling

Every feature must include:

- try/catch in backend logic
- structured API error responses
- user-friendly UI error messages

Never allow silent failures.

---

## Definition of Done

A task is only complete when:

- Code runs without errors
- UI renders correctly
- API works correctly
- Data persists correctly
- Errors are handled properly
- RBAC is respected

If any of these are missing, the task is NOT complete.

---

## Git Rules

After each logical step:

1. Stage changes
2. Create a clear commit message

Format:

- feat: add login endpoint
- fix: correct validation logic
- refactor: simplify API handler

---

## Platform Constraints (Cloudflare)

- Backend must run on Cloudflare Workers
- Use D1 for database
- Use R2 only when required
- Use Wrangler for deployment

Do NOT introduce:
- Express servers
- alternative hosting
- additional databases

Unless explicitly instructed.

---

## When Unsure

If uncertain about:
- requirements
- structure
- expected behavior

The agent must:

1. Stop
2. Explain uncertainty
3. Suggest options
4. Wait for direction

Do NOT guess.

---

## Continuous Improvement

After completing a feature, the agent should:

1. Identify what worked well
2. Identify friction or inefficiencies
3. Suggest improvements to:
   - template structure
   - API patterns
   - UI patterns
   - file organization

Improvements must be reusable across projects.

---

## Output Expectations

For every change, provide:

- Files changed
- What was added/modified
- What needs to be tested
- Next recommended step

---

## Final Rule

Speed matters.

But clarity, correctness, and maintainability matter more.

Build something that works end-to-end first.
Then improve it.
