## Coding Rules

These rules capture the conventions we want to follow consistently across the
project. Treat them as living documentation—update the file when we adopt new
practices or deprecate old ones.

### Architecture & Layering
- Preserve our Controller → Service → Repository flow. Controllers stay thin,
  services encapsulate business logic, and repositories are the only layer that
  talks to Prisma.
- Use the dependency-injection containers (`ControllerContainer`,
  `ServiceContainer`, `RepositoryContainer`) when wiring new modules so they can
  be reused across schedulers, HTTP handlers, and scripts.
- New middleware must explicitly consider order relative to security middleware
  (CORS → Helmet → body parsers → sanitizers → CSRF). Document the reason any
  insertion point differs from the default chain in `src/index.ts`.
- Follow existing response helpers (`sendSuccessResponse`, `sendAppErrorResponse`,
  `handleControllerError`) to keep localization keys and telemetry consistent.

### Internationalization & Translation
- **All user-facing messages must use translation keys**, never hardcoded strings in Turkish, English, or any other language.
- **Success messages**: Use translation keys starting with `success.` (e.g., `'success.appointment.created'`) when calling `sendSuccessResponse()`, `sendPaginatedResponse()`, or `sendSuccessWithMeta()`. These functions automatically translate based on the `Accept-Language` header.
- **Error messages**: Always throw proper error classes (`NotFoundError`, `ValidationError`, `BusinessError`, etc.) from `src/types/errors.ts` with appropriate error codes from `ERROR_CODES` in `src/constants/errorCodes.ts`. The error handler middleware automatically translates errors based on their error code.
- **Never use `throw new Error()`** with hardcoded messages. Use appropriate error classes that map to translation keys:
  - `NotFoundError` for resources not found (maps to `errors.*.notFound`)
  - `ValidationError` for validation failures (maps to `errors.validation.*`)
  - `BusinessError` for business logic violations (maps to `errors.business.*`)
  - `ForbiddenError` for authorization failures (maps to `errors.auth.*` or `errors.permission.*`)
- **Translation keys format**:
  - Success messages: `success.<domain>.<action>` (e.g., `success.appointment.created`, `success.business.updated`)
  - Error messages: `errors.<category>.<type>` (e.g., `errors.auth.unauthorized`, `errors.business.notFound`)
  - Notification messages: `notifications.<type>` (e.g., `notifications.appointmentReminder`)
- **Adding new translations**: Add entries to `src/services/core/translationService.ts` in the `initializeTranslations()` method for both Turkish (`tr`) and English (`en`). Use `{{paramName}}` for dynamic values.
- **Error codes mapping**: Every error code in `ERROR_CODES` must have a corresponding entry in `ERROR_TRANSLATION_KEYS` that maps to a translation key. When adding new error codes, add both the code and its translation key mapping.
- **Language detection**: Language is automatically detected from:
  1. `Accept-Language` HTTP header (set by frontend)
  2. User's language preference (if authenticated)
  3. Default: `tr` (Turkish)
- **Translation parameters**: Use the `params` argument in `sendSuccessResponse()` for dynamic values (e.g., `{ count: 5, resource: 'appointments' }`). Translation templates use `{{paramName}}` syntax.
- **Notification translations**: Use `TranslationService.translate()` directly in notification services to get translated messages for SMS/email/push notifications.
- **Testing translations**: Use `src/scripts/test-translations.ts` to verify translation keys work correctly. Ensure all new translation keys are tested.

### TypeScript & Validation
- Avoid the `any` type; prefer explicit, narrow types or generics. If a temporary
  fallback is unavoidable, add a TODO referencing the work item that will replace
  it.
- Keep strict compiler options enabled; do not use `// @ts-ignore` unless the
  suppression is justified in a comment and linked to tracking work.
- All external input must be validated with the same primitives the rest of the
  codebase uses (`zod`, `Joi`, typed DTOs). Do not bypass schema validation in
  controllers or services.
- Reuse shared types from `src/types` and constants from `src/constants` instead
  of redeclaring literals (e.g., error codes, appointment statuses).
- Define API/DTO/domain interfaces in `src/types` (organized by domain). Inline
  types inside controllers/services are only for single-use helpers—promote them
  to shared modules once they are reused, exported, or represent request/response
  contracts.

### Logging, Monitoring & Metrics
- Use `src/utils/Logger/logger` for every log. Include request context (requestId,
  userId, businessId) when available; never `console.log` in production code.
- Emit metrics via `metricsMiddleware`/`getMetrics` helpers or extend
  Prometheus counters defined in `src/utils/metrics`. Every long-running worker
  or scheduler should expose success/failure counters.
- When adding new endpoints, expand the OpenAPI spec (`config/swagger.ts`) so
  `/api-docs` stays accurate.
- Keep health checks and startup logs informative—if you add a dependency, update
  the `/health` checks accordingly.

### Security & Privacy
- Input must be sanitized (`sanitizeQuery`, `sanitizeBody`) and validated before
  reaching business logic. Never trust raw `req.body`, `req.query`, or headers.
- All authenticated routes must pass through `AuthMiddleware` and, when roles
  matter, `AuthorizationMiddleware`. Document any anonymous or public endpoints.
- Respect CSRF/RBAC/rate limiting defaults. If a route needs custom limits,
  configure them in code or Nginx and document the rationale.
- Never log secrets, access tokens, payment details, or PII. When in doubt,
  redact data before logging.
- Follow the principle of least privilege for AWS, Redis, Iyzipay, and other
  integrations. Credentials belong in environment files, never in code.

### Configuration & Environment
- Any new environment variable must be added to `env.example`, `.env.production`,
  `.env.test`, validated in `src/config/environment.ts`, and documented in
  relevant docs or scripts (`scripts/validate-production.js`).
- Production requires explicit `CORS_ORIGINS`; do not relax this locally without
  documenting the reason.
- Prefer feature flags or config entries over NODE_ENV checks when behavior needs
  more granularity.

### Data Layer & Prisma
- Use Prisma for data access. Raw SQL (`$queryRaw`) needs a comment explaining
  why Prisma models are insufficient, plus input sanitization.
- Every schema change must go through `prisma schema.prisma` + `prisma migrate`.
  Keep migrations deterministic and review generated SQL before committing.
- Seed data via the scripts under `prisma/` or `scripts/`. Ensure seeds are
  idempotent so they can run in Docker and CI environments safely.
- Wrap multi-step operations in Prisma transactions or service-level guards to
  avoid partial writes.

### Caching & Redis
- Use `cacheService` or `cacheManager` utilities rather than talking to Redis
  directly. Centralizing keys keeps eviction strategies consistent.
- Document TTL/invalidation plans for every cached payload. If a job warms a
  cache on startup (see `services.startupService`), update that logic when adding
  new cached entities.
- Monitor cache health: if new services rely on Redis, extend the `/health`
  checks so we can detect failures quickly.

### Background Jobs & Scheduling
- Scheduler services (`subscriptionSchedulerService`, `appointmentSchedulerService`,
  `appointmentReminderService`) must remain idempotent. Any new cron job should
  follow the same pattern: injectable dependencies, safe retries, and logging.
- Guard background work with environment checks (e.g., disable in `test`,
  accelerate in `development`) to match existing behavior.
- Long-running scripts belong in `scripts/` with documentation in `docs/`.

### Testing
- Tests run through Jest with setup in `tests/setup.ts` and a 30‑second timeout.
  Use `.env.test` for configuration instead of mutating shared env files.
- Add or update unit, integration, and e2e tests when behavior changes. Fail the
  test before the feature fix to ensure coverage.
- Use fakes/mocks for external services (AWS, Redis, Iyzipay) and prefer
  SuperTest for HTTP flows. Do not reach into real third-party services from CI.
- Run `npm run test:<scope>` that matches your change before opening a PR. If a
  suite is skipped, capture the reason in the PR description.

### Documentation & Communication
- Update `README.md`, relevant `docs/*.md`, and swagger definitions whenever APIs,
  infrastructure, or operational steps change.
- Comment only when logic is non-obvious; explain intent, not mechanics.
- Surface follow-up work (tech debt, migrations, data backfills) in GitHub issues
  or TODO comments with owners.

### Git, Review & Deployment
- Keep commits scoped to a single logical change with descriptive messages. Do
  not rewrite another contributor’s history; add follow-up commits instead.
- Validate deployments using the provided scripts (`dev.sh`, `deploy.sh`,
  `validate:production`, `init:production`) and keep Docker/Nginx configs in sync
  with application changes.
- Before merging, confirm that docker-compose manifests, Makefile targets, and
  monitoring dashboards reflect any new ports, services, or metrics.

### Process
- If a rule blocks progress, discuss with the team before making exceptions.
- When we adopt a new rule, add it here with context so the playbook stays useful
  and accurate.
