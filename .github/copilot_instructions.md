# Copilot / AI assistant instructions for this repository

Purpose: give clear, repo-specific guidance for any AI code assistant (Copilot, ChatGPT, etc.) so generated code follows the project's architecture and quality expectations.

---

Core directives (apply ALWAYS)
- Follow Clean Architecture: keep code separated into layers (entities, use_cases / interactors, adapters/repositories, drivers/routers/controllers). Do not mix persistence or framework concerns into use case logic.
- Follow SOLID principles: single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion.
- Prefer small, well-named functions and classes. Each function should do one thing and be easily testable.
- Provide type annotations everywhere (Python typing / TypeScript types). Use Pydantic models for FastAPI request/response models.
- Write or update unit tests for any non-trivial change. Place tests next to the appropriate package under `cookibud-api/tests` or front-end test folders.
- Add or update documentation (docstrings, small README notes or comments) for new modules or public functions.
- Do not change public APIs (HTTP routes, exported front-end component props) without keeping compatibility or adding migration notes and tests.

Repository-specific guidance
- Backend (FastAPI) — `cookibud-api`
  - Keep business logic in `use_cases/` and domain entities under `entities/`.
  - Data access code belongs in `adapters/` (e.g., `adapters/mongodb/recipe_repository.py`). Use ports/interfaces in `adapters/ports/` to invert dependencies.
  - Routers/controllers in `drivers/routers/` should be thin: validate/parse input, call use case, return appropriate response model or raise HTTPException.
  - Use Pydantic models for validation and response serialization. Put schema/docs notes in `adapters/mongodb/schema.md` where relevant.
  - Prefer dependency injection via small provider functions in `drivers/dependencies.py`.
  - Add tests in `cookibud-api/tests/` covering use cases and adapters. When adding tests that require MongoDB, aim for small integration tests, but prefer mocking adapters for unit tests.

- Frontend (React + Vite + TypeScript + Tailwind) — `cookibud-front`
  - Keep API calls centralized in `src/services/api.ts` and `src/services/idb.ts` for offline caching.
  - Components belong in `src/pages/` for page-level and `src/components/` for shared UI; prefer presentational components and small container logic where needed.
  - Use functional components and React hooks. Keep inputs controlled when appropriate.
  - Use TypeScript interfaces/types from `src/utils/constants/types.ts` where helpful; add types for new data shapes.
  - Respect i18n patterns in `src/i18n.ts`; return translated strings using `useTranslation` with appropriate keyPrefix.
  - Add unit tests using your project test framework (e.g., React Testing Library + Vitest/Jest) for new components and hooks.
  - Always design UI following Mobile First principles
  - Comply to `Brand Guidelines.md`, prefer using Tailwind color variables defined in `src/style.css`
  - Avoid nesting functions more than 4 levels deep.

Code quality and tools
- Run linters and formatters. Keep code consistent with project's existing style. If repository includes ESLint/Prettier or Python formatters (black/isort), follow their rules.
- Keep changes minimal and incremental. If a larger refactor is necessary, break into smaller, reviewable commits.
- When adding dependencies, prefer lightweight, well-maintained packages and add them to the relevant manifest (`requirements.txt` or `package.json`). Note the reason in the commit message.

Testing and CI
- Always add tests for new behavior. For backend, add fast unit tests that mock DB adapters and a couple of small integration tests that exercise adapters against a test MongoDB if available.
- Keep tests deterministic and fast. Avoid flakiness by not relying on external network services.

Commit messages & PRs
- Use clear, descriptive commit messages and PR titles. For code changes: brief summary; for larger PRs include a short “what/why/how” in the PR description.
- If the change touches public API (backend routes or front-end exported components), list the impact and migration steps in the PR description.

When generating code, include these artifacts in the same change:
- Implementation (source file)
- Unit tests (happy path + 1-2 edge cases)
- Minimal documentation update (README snippet, docstring or comment)

If uncertain about structure or where to place files, follow existing patterns in the repository first (look at `use_cases/`, `adapters/`, `drivers/` for backend; `src/pages`, `src/services` for frontend).

Examples (short)
- Backend: new business rule -> add function/class in `use_cases/`, create input/output Pydantic models in `entities/` or `adapters/ports`, add adapter method in `adapters/...` if persistence needed, call from `drivers/routers/<name>.py`.
- Frontend: new feature data fetch -> add method in `src/services/api.ts`, add TypeScript types in `src/utils/constants/types.ts`, use in a page component under `src/pages/` and add UI tests.
