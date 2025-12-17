# Commit Conventions

> This document defines **mandatory commit message standards** for the randevubu.server project. Following these conventions ensures clear, consistent, and traceable version history.

---

## Why Commit Conventions Matter

- **Clarity**: Everyone understands what changed and why
- **Automation**: Enables automatic changelog generation
- **Navigation**: Easy to search and filter commits
- **Quality**: Forces developers to think about the scope and impact of changes

---

## Commit Message Format

Each commit message must follow this structure:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Components

#### 1. Type (Required)

The type describes the **kind of change** being made:

| Type       | Description                                             | Example                                     |
| ---------- | ------------------------------------------------------- | ------------------------------------------- |
| `feat`     | New feature                                             | `feat(auth): add two-factor authentication` |
| `fix`      | Bug fix                                                 | `fix(appointments): resolve timezone issue` |
| `docs`     | Documentation only changes                              | `docs(readme): update installation steps`   |
| `style`    | Code style changes (formatting, semicolons, whitespace) | `style(services): format with prettier`     |
| `refactor` | Code refactoring (no functional changes)                | `refactor(auth): extract validation logic`  |
| `perf`     | Performance improvements                                | `perf(db): add index on user email`         |
| `test`     | Adding or updating tests                                | `test(auth): add unit tests for login`      |
| `build`    | Build system or dependency changes                      | `build: upgrade prisma to v6.14.0`          |
| `ci`       | CI/CD configuration changes                             | `ci: add docker build workflow`             |
| `chore`    | Other changes (tooling, configs, etc.)                  | `chore: add husky pre-commit hooks`         |
| `revert`   | Revert a previous commit                                | `revert: revert commit abc123`              |

#### 2. Scope (Optional but Recommended)

The scope describes **what part of the codebase** is affected:

**Common Scopes:**

- `auth` - Authentication/authorization
- `appointments` - Appointment management
- `users` - User management
- `business` - Business logic
- `db` - Database/Prisma
- `api` - API endpoints
- `jobs` - Background jobs
- `cache` - Caching layer
- `config` - Configuration
- `deps` - Dependencies

**Examples:**

```
feat(auth): add JWT refresh token rotation
fix(appointments): prevent double booking
refactor(users): move validation to repository layer
```

#### 3. Subject (Required)

The subject is a **brief description** of the change:

✅ **DO:**

- Use imperative mood ("add" not "added" or "adds")
- Start with lowercase
- No period at the end
- Keep it under 50 characters
- Be specific and clear

❌ **DON'T:**

```
fix: fixed bug
feat: new stuff
refactor: changes
```

✅ **DO:**

```
fix(auth): prevent token expiration race condition
feat(appointments): add recurring appointment support
refactor(services): extract email notification logic
```

#### 4. Body (Optional)

The body provides **detailed explanation** of the change:

- Explain **what** and **why**, not **how**
- Reference related issues or tickets
- Describe breaking changes
- Wrap at 100 characters per line

**Example:**

```
feat(auth): add two-factor authentication

Implements TOTP-based 2FA using authenticator apps.
Users can enable 2FA in their security settings.

This addresses security concerns raised in issue #123.

Breaking change: Auth middleware now requires 2FA
token for protected routes when user has 2FA enabled.
```

#### 5. Footer (Optional)

The footer contains **metadata** about the commit:

- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Closes #123`, `Fixes #456`, `Refs #789`
- Co-authors: `Co-authored-by: Name <email>`

**Example:**

```
feat(api): redesign authentication endpoints

BREAKING CHANGE: /auth/login now returns different response structure
Closes #234
```

---

## Complete Examples

### Simple Feature

```
feat(appointments): add email reminders
```

### Bug Fix with Details

```
fix(auth): resolve session timeout issue

Users were being logged out prematurely due to
incorrect token expiration calculation. Now using
server time instead of client time.

Fixes #456
```

### Breaking Change

```
refactor(api): restructure error response format

Standardize all API error responses to follow
the new ErrorResponse interface defined in
src/types/errors.ts

BREAKING CHANGE: All error responses now return
{ code, message, details } instead of { error }

Refs #789
```

### Refactoring

```
refactor(services): migrate to dependency injection

Move all services to use constructor injection
following the rules in docs/rules.md. This improves
testability and follows SOLID principles.

- AuthService now receives dependencies via constructor
- Removed global service instances
- Updated ServiceContainer accordingly
```

---

## Rules Enforcement

Our project uses **automated tools** to enforce these conventions:

### Pre-commit Hooks (Husky + lint-staged)

Before each commit, the following checks run automatically:

1. **TypeScript Type Checking** - Ensures no type errors
2. **Code Formatting** - Runs Prettier on staged files
3. **Prisma Schema Formatting** - Formats schema.prisma

### Commit Message Validation (commitlint)

After writing your commit message, it's validated against:

- ✅ Type must be from allowed list
- ✅ Subject must not be empty
- ✅ Header must be ≤ 100 characters
- ✅ Body lines must be ≤ 100 characters
- ✅ Proper formatting and structure

**If validation fails**, the commit is rejected and you must fix the message.

---

## How to Write Good Commits

### 1. Make Small, Focused Commits

❌ **Bad:**

```
feat: add user management, fix auth bug, update docs
```

✅ **Good:**

```
feat(users): add user profile update endpoint
fix(auth): prevent duplicate session creation
docs(api): update authentication documentation
```

### 2. Commit Often

- Commit after completing a logical unit of work
- Don't wait until end of day to commit everything
- Makes code review easier
- Easier to revert if needed

### 3. Reference Issues

Always link commits to issues/tickets:

```
fix(appointments): prevent overlapping bookings

Closes #123
```

### 4. Explain the Why

The code shows **what** changed. The commit message should explain **why**:

❌ **Bad:**

```
refactor(auth): change validation
```

✅ **Good:**

```
refactor(auth): extract validation to follow DRY principle

Validation logic was duplicated across login and
register endpoints. Extracted to shared validator
to improve maintainability.
```

---

## Common Scenarios

### Adding a New Feature

```
feat(appointments): add recurring appointment support

Allows users to create daily, weekly, or monthly
recurring appointments with customizable end date.

Closes #234
```

### Fixing a Bug

```
fix(cache): resolve Redis connection timeout

Increased connection timeout from 5s to 30s and
added retry logic to handle temporary network issues.

Fixes #456
```

### Refactoring Code

```
refactor(services): migrate to repository pattern

Moved all Prisma calls from services to dedicated
repository classes following docs/rules.md section 1.1.

This improves testability and separation of concerns.
```

### Updating Dependencies

```
build(deps): upgrade prisma to v6.14.0

Includes performance improvements and bug fixes.
Updated migrations to use new syntax.
```

### Improving Performance

```
perf(db): add composite index on appointments table

Added index on (businessId, date) to optimize
appointment lookup queries. Reduces query time
from 200ms to 15ms on large datasets.
```

### Documentation Changes

```
docs(rules): add commit convention guidelines

Created comprehensive guide for team members to
understand and follow commit message standards.
```

---

## Bypassing Hooks (Emergency Only)

In rare cases, you may need to bypass hooks:

```bash
git commit --no-verify -m "emergency fix"
```

⚠️ **WARNING:** Only use this for critical production hotfixes. All bypassed commits must be cleaned up later.

---

## Tools and Commands

### Check Commit Message Manually

```bash
echo "feat(auth): add login" | npx commitlint
```

### Run Pre-commit Checks Manually

```bash
npx lint-staged
```

### Format All Files

```bash
npx prettier --write .
```

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Project Coding Rules](./rules.md)

---

## Questions?

If you're unsure about how to format a commit message, ask the team or refer to recent commits in the repository for examples.

**Remember:** Good commit messages are a gift to your future self and your teammates! 🎁
