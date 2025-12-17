# Git Hooks Setup - Quick Reference

## 🎯 What Changed?

We've added **automated Git hooks** using Husky to enforce code quality and commit standards.

## 🚀 What Happens Now?

### When You Commit Code

**Before the commit is created:**

1. ✅ TypeScript type checking runs on staged files
2. ✅ Prettier formats your code automatically
3. ✅ Prisma schema gets formatted (if modified)

**After you write your commit message:**

1. ✅ Commit message is validated against Conventional Commits format
2. ❌ If invalid, commit is rejected with helpful error message

## 📝 Commit Message Format (Required)

```
<type>(<scope>): <subject>
```

### Examples

✅ **Good:**

```
feat(auth): add two-factor authentication
fix(appointments): resolve timezone calculation bug
refactor(services): migrate to dependency injection
docs(readme): update setup instructions
test(auth): add unit tests for login flow
chore(deps): upgrade prisma to v6.14.0
```

❌ **Bad:**

```
fixed bug
new feature
updates
WIP
asdf
```

## 🔧 Common Types

| Type       | When to Use      | Example                                        |
| ---------- | ---------------- | ---------------------------------------------- |
| `feat`     | New feature      | `feat(users): add profile picture upload`      |
| `fix`      | Bug fix          | `fix(cache): resolve Redis connection timeout` |
| `refactor` | Code refactoring | `refactor(auth): extract validation logic`     |
| `docs`     | Documentation    | `docs(api): update endpoint documentation`     |
| `style`    | Code formatting  | `style(services): format with prettier`        |
| `test`     | Tests            | `test(users): add integration tests`           |
| `chore`    | Tooling/config   | `chore: add husky pre-commit hooks`            |
| `perf`     | Performance      | `perf(db): add index on appointments`          |

## 🛠️ Common Scopes

Use these to indicate which part of the codebase changed:

- `auth` - Authentication/authorization
- `appointments` - Appointment management
- `users` - User management
- `business` - Business logic
- `db` - Database/Prisma
- `api` - API endpoints
- `jobs` - Background jobs
- `cache` - Caching
- `config` - Configuration
- `deps` - Dependencies

## 🚨 What If My Commit Is Rejected?

### Type Check Failure

```
✖ tsc --noEmit
  Error: Type 'string' is not assignable to type 'number'
```

**Fix:** Resolve the TypeScript errors in your code, then try again.

### Commit Message Failure

```
✖ subject may not be empty [subject-empty]
✖ type may not be empty [type-empty]
```

**Fix:** Rewrite your commit message following the format above.

### Formatting Issues

Don't worry! Prettier automatically formats your code. Just stage the formatted files and commit again:

```bash
git add .
git commit -m "your message"
```

## 🆘 Emergency Bypass (Use Sparingly!)

In critical production emergencies ONLY:

```bash
git commit --no-verify -m "emergency: fix critical production bug"
```

⚠️ **Warning:** This bypasses all checks. Use only for hotfixes, and clean up later!

## 📖 Full Documentation

For detailed guidelines, examples, and best practices:

👉 **[docs/commit-conventions.md](./commit-conventions.md)**

## 💡 Tips

1. **Commit often** - Small, focused commits are better
2. **Be specific** - "fix login bug" → "fix(auth): prevent session timeout on refresh"
3. **Use scope** - Helps everyone understand what area changed
4. **Write for others** - Your future self will thank you!

## 🤝 Questions?

If you're unsure about:

- How to format a commit message
- Which type to use
- Whether your commit will pass

Ask the team or check recent commits for examples!

---

**Remember:** These tools are here to help us maintain high code quality and clear history. They might feel strict at first, but they make collaboration much smoother! 🚀
