# Husky Git Hooks - Quick Reference

## 🎯 What Are These Hooks?

This directory contains Git hooks managed by Husky that automatically run when you commit code.

## 📁 Directory Structure

```
.husky/
├── _/                    # Husky internal files (auto-generated)
├── pre-commit            # Runs BEFORE commit is created
├── commit-msg            # Runs AFTER you write commit message
└── docs/                 # Documentation (this folder)
    └── README.md         # This file
```

## 🔧 Active Hooks

### 1. `pre-commit`

**When it runs:** Before the commit is created  
**What it does:**

- ✅ TypeScript type checking on staged files
- ✅ Prettier code formatting on staged files
- ✅ Prisma schema formatting (if modified)

**Command:** `npx lint-staged`

### 2. `commit-msg`

**When it runs:** After you write your commit message  
**What it does:**

- ✅ Validates commit message format
- ✅ Enforces Conventional Commits standard

**Command:** `npx --no -- commitlint --edit $1`

## 📝 Commit Message Format (Required)

```
<type>(<scope>): <subject>

Examples:
feat(auth): add two-factor authentication
fix(appointments): resolve timezone issue
refactor(services): migrate to dependency injection
```

## 🔗 Full Documentation

For complete guidelines, see:

- **[docs/commit-conventions.md](../../docs/commit-conventions.md)** - Full guide
- **[docs/git-hooks-quick-reference.md](../../docs/git-hooks-quick-reference.md)** - Quick reference
- **[docs/git-workflow-diagram.md](../../docs/git-workflow-diagram.md)** - Visual workflow
- **[docs/onboarding-checklist.md](../../docs/onboarding-checklist.md)** - New developer setup

## 🛠️ Maintenance

### Disable Hooks Temporarily (Not Recommended)

```bash
# Skip pre-commit and commit-msg hooks
git commit --no-verify -m "your message"
```

⚠️ **Warning:** Only use in emergencies!

### Reinstall Hooks

```bash
npm install
# or
npx husky install
```

### Update Hook Scripts

Edit the hook files directly:

- `.husky/pre-commit`
- `.husky/commit-msg`

After editing, make them executable (Mac/Linux):

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

## 🚨 Troubleshooting

### Hooks Not Running?

```bash
# Reinstall Husky
npx husky install

# Verify hooks exist
ls -la .husky/
```

### Permission Denied (Mac/Linux)?

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### Want to Skip Hooks Once?

```bash
git commit --no-verify -m "emergency fix"
```

## 📚 Related Configuration Files

- **`.lintstagedrc.js`** - Defines what runs on staged files
- **`commitlint.config.js`** - Commit message validation rules
- **`.prettierrc`** - Code formatting rules
- **`.prettierignore`** - Files to skip formatting

## 🤝 Questions?

Check the main documentation in `docs/` or ask the team!

---

**Note:** These hooks help maintain code quality and consistent commit history. They're here to help, not hinder! 🚀
