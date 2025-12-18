# Server-Side Coding Rules (Node.js / OOP)

> This document defines **mandatory coding rules** for the server-side project. It combines legacy conventions with updated best practices, removing deprecated or harmful patterns. The primary goals are **maintainability, correctness, testability, security, and scalability**.

This is **living documentation**. Any exception or new rule must be discussed and documented here.

---

## 1. Architecture & Layering

### 1.1 Layered Flow (Strict)

**Controller → Service → Repository → Data Source**

- Controllers:
  - Handle HTTP/transport concerns only
  - Call services
  - Map inputs/outputs
  - Never contain business rules or DB access

- Services:
  - Encapsulate business logic
  - Coordinate multiple repositories if needed
  - Are framework-agnostic

- Repositories:
  - Handle data access only
  - Prisma is allowed **only here**

---

### 1.2 Dependency Injection Containers

- Dependency wiring must go through DI containers:
  - `ControllerContainer`
  - `ServiceContainer`
  - `RepositoryContainer`

- Containers are **composition roots**, not service locators.

- Classes must not import containers directly.

❌ Forbidden:

```ts
ServiceContainer.get(UserService);
```

✅ Allowed:

```ts
new UserService(userRepository);
```

---

## 2. Dependency Injection Rules (Critical)

### 2.1 Constructor Injection Only

- All dependencies **must be injected via constructors**
- No property injection
- No runtime resolution

```ts
class OrderService {
  constructor(private readonly orderRepo: IOrderRepository) {}
}
```

---

### 2.2 No `new` Outside Composition Roots

- `new` is allowed only in:
  - Containers
  - App/bootstrap entry points

❌ Forbidden in controllers/services:

```ts
new PrismaClient();
new Logger();
new SomeService();
```

---

### 2.3 Depend on Abstractions

- Services depend on interfaces or abstract classes
- Implementations are swapped at wiring time

```ts
interface IUserRepository {
  findById(id: string): Promise<User>;
}
```

---

### 2.4 No Global Singletons or Static State

- No exported instances
- No static mutable properties

---

## 3. Middleware & Request Flow

- Default order:
  **CORS → Helmet → Body Parsers → Sanitizers → CSRF → Auth → Authorization**

- Any deviation must be:
  - Explicitly documented
  - Justified in `src/index.ts`

---

## 4. Internationalization & Translation (Strict)

### 4.1 User-Facing Messages

- **No hardcoded user-facing strings**
- Always use translation keys

---

### 4.2 Success Messages

- Prefix: `success.<domain>.<action>`
- Use only via:
  - `sendSuccessResponse`
  - `sendPaginatedResponse`
  - `sendSuccessWithMeta`

---

### 4.3 Error Handling & Translation

- Never `throw new Error()`
- Always throw typed errors from `src/types/errors.ts`

| Error Type        | Use Case          |
| ----------------- | ----------------- |
| `NotFoundError`   | Missing resources |
| `ValidationError` | Invalid input     |
| `BusinessError`   | Rule violation    |
| `ForbiddenError`  | Auth / permission |

- All error codes must map to translation keys via `ERROR_TRANSLATION_KEYS`

---

### 4.4 Translation Management

- All translations live in `translationService.initializeTranslations()`
- Must support **both `tr` and `en`**
- Dynamic values use `{{paramName}}`

---

## 5. TypeScript & Validation

- `any` is forbidden unless explicitly justified with a TODO
- `@ts-ignore` requires explanation
- Strict compiler options must remain enabled

---

### 5.1 Input Validation

- All external input must be validated
- Use shared primitives (`zod`, `Joi`, DTOs)
- Never trust raw `req.body`, `req.query`, or headers

---

### 5.2 Shared Types

- Reuse types from:
  - `src/types`
  - `src/constants`

---

## 6. Logging, Monitoring & Metrics

- Use `src/utils/Logger/logger`
- `console.log` is forbidden in production code
- Include context when available:
  - `requestId`
  - `userId`
  - `businessId`

---

### 6.1 Metrics

- Use Prometheus helpers
- Every long-running job must emit success/failure counters

---

## 7. Security & Privacy

- Sanitize **before** validation

- All protected routes must pass:
  - `AuthMiddleware`
  - `AuthorizationMiddleware` (if applicable)

- Never log:
  - Secrets
  - Tokens
  - PII

---

## 8. Configuration & Environment

- New env vars must:
  - Exist in `env.example`
  - Be validated in `environment.ts`
  - Be documented

- Avoid `NODE_ENV` branching when config flags are clearer

---

## 9. Data Layer & Prisma

- Prisma access is repository-only

- `$queryRaw` requires:
  - Justification
  - Sanitization

- All schema changes require migrations

---

## 10. Caching & Redis

- Use `cacheService` / `cacheManager`
- No direct Redis access
- TTL & invalidation must be documented

---

## 11. Background Jobs & Scheduling

- Jobs must be:
  - Idempotent
  - Injectable
  - Logged

- Environment-aware execution is mandatory

---

## 12. Testing Rules

- Tests must not touch:
  - Real DB
  - Network
  - Third-party services

- Use mocks/fakes

- Fail tests before fixing behavior

---

## 13. Documentation & Communication

- Update docs, Swagger, and README on changes
- Comment intent, not implementation

---

## 14. Git, Review & Deployment

- Small, scoped commits
- Follow [Commit Conventions](./commit-conventions.md) for all commit messages
- Do not rewrite shared history
- Validate Docker, Nginx, and monitoring changes

### 14.1 Commit Standards (Enforced)

- All commits must follow **Conventional Commits** format
- Husky pre-commit hooks will:
  - Run TypeScript type checking
  - Format code with Prettier
  - Validate Prisma schema formatting
- Husky commit-msg hook will validate commit message format
- See [docs/commit-conventions.md](./commit-conventions.md) for detailed guidelines

---

## 15. Final Rule

> **If a class is hard to test, its design is wrong.**

Breaking a rule requires team discussion and documentation.
