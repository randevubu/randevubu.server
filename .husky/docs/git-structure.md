# Git Repository Structure - What to Commit

This document explains what files should be committed to Git and what should be ignored.

## ✅ COMMIT These Files (Already Configured)

### Husky & Git Hooks

```
.husky/
├── _/                    # ✅ COMMIT - Husky internal setup
├── pre-commit            # ✅ COMMIT - Pre-commit hook script
├── commit-msg            # ✅ COMMIT - Commit message validation
└── README.md             # ✅ COMMIT - Hook documentation
```

**Why?** Everyone on the team needs the same Git hooks to enforce standards.

### Configuration Files

```
✅ .lintstagedrc.js       # Defines pre-commit checks
✅ commitlint.config.js   # Commit message rules
✅ .prettierrc            # Code formatting rules
✅ .prettierignore        # Files to skip formatting
✅ .gitignore             # Files to ignore in Git
✅ tsconfig.json          # TypeScript configuration
✅ package.json           # Dependencies and scripts
✅ package-lock.json      # Locked dependency versions
```

**Why?** These ensure everyone has the same development environment and tooling.

### Documentation

```
docs/
├── ✅ rules.md                      # Coding rules
├── ✅ commit-conventions.md         # Commit message guide
├── ✅ git-hooks-quick-reference.md  # Quick reference
├── ✅ git-workflow-diagram.md       # Visual workflow
├── ✅ onboarding-checklist.md       # New developer guide
└── ✅ git-structure.md              # This file
```

**Why?** Documentation is essential for team collaboration and onboarding.

### Source Code

```
src/
├── ✅ All TypeScript files (.ts)
├── ✅ All configuration files
└── ✅ All source code
```

### Database

```
prisma/
├── ✅ schema.prisma      # Database schema
├── ✅ migrations/        # Database migrations
└── ✅ seed files         # Seed data scripts
```

### Tests

```
tests/
├── ✅ All test files
└── ✅ Test fixtures
```

### Docker & Deployment

```
✅ Dockerfile
✅ docker-compose.yml
✅ docker-compose.dev.yml
✅ docker-compose.production.yml
✅ nginx/
✅ scripts/
```

### Environment Templates

```
✅ env.example            # Template for .env
✅ env.production.example # Template for .env.production
```

**Why?** Templates help new developers set up their environment.

---

## ❌ IGNORE These Files (Already Configured)

### Dependencies

```
❌ node_modules/          # Installed packages
```

**Why?** Huge directory, can be recreated with `npm install`.

### Build Artifacts

```
❌ dist/                  # Compiled JavaScript
❌ build/                 # Build output
❌ coverage/              # Test coverage reports
❌ src/generated/prisma   # Generated Prisma client
```

**Why?** These are generated from source code and can be rebuilt.

### Environment Files

```
❌ .env                   # Local environment variables
❌ .env.production        # Production secrets
❌ .env.local             # Local overrides
❌ .env.*.local           # Any local env files
```

**Why?** Contains secrets and local configuration that varies per developer/environment.

### Logs

```
❌ *.log                  # All log files
❌ logs/                  # Log directory
❌ npm-debug.log*
❌ yarn-debug.log*
❌ yarn-error.log*
```

**Why?** Logs are runtime artifacts, not source code.

### Uploads & User Data

```
❌ uploads/               # User uploaded files
```

**Why?** User data should not be in version control.

### OS & IDE Files

```
❌ .DS_Store              # macOS metadata
❌ Thumbs.db              # Windows metadata
❌ .vscode/               # VS Code settings (optional)
❌ .idea/                 # IntelliJ settings (optional)
```

**Why?** These are personal/OS-specific and vary per developer.

---

## 🤔 Current Setup Summary

### What's Committed (Good!)

- ✅ Husky hooks (`.husky/pre-commit`, `.husky/commit-msg`)
- ✅ Husky configuration (`.husky/_/`)
- ✅ All configuration files (`.lintstagedrc.js`, `commitlint.config.js`, etc.)
- ✅ All documentation (`docs/`)
- ✅ Environment templates (`env.example`)

### What's Ignored (Good!)

- ❌ Dependencies (`node_modules/`)
- ❌ Secrets (`.env`, `.env.production`)
- ❌ Build artifacts (`dist/`, `build/`)
- ❌ Logs (`*.log`, `logs/`)
- ❌ User uploads (`uploads/`)

---

## 📝 Current `.gitignore`

```gitignore
# Dependencies
node_modules/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log
logs/

# Environment files (secrets)
.env
.env.production

# Build artifacts
dist/
build/
coverage/
/src/generated/prisma

# User uploads
uploads/

# OS files
.DS_Store
```

---

## ✅ Verification Checklist

Run these commands to verify your setup:

### Check what's committed:

```bash
git ls-files .husky/
```

Should show:

```
.husky/_/husky.sh
.husky/commit-msg
.husky/pre-commit
.husky/README.md
```

### Check what's ignored:

```bash
git status --ignored
```

Should show:

```
node_modules/
.env
dist/
*.log
```

### Check documentation:

```bash
git ls-files docs/
```

Should show all `.md` files in `docs/`.

---

## 🎯 Best Practices

### ✅ DO Commit:

1. **Configuration files** - Everyone needs the same setup
2. **Documentation** - Essential for team collaboration
3. **Git hooks** - Enforce standards for everyone
4. **Environment templates** - Help new developers
5. **Source code** - Obviously!

### ❌ DON'T Commit:

1. **Secrets** - Use environment variables
2. **Dependencies** - Use `package.json` instead
3. **Build artifacts** - Can be regenerated
4. **Personal settings** - IDE configs, OS files
5. **User data** - Uploads, logs, etc.

---

## 🚀 For New Developers

When you clone the repository:

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd randevubu.server
   ```

2. **Install dependencies** (this installs Husky automatically)

   ```bash
   npm install
   ```

3. **Set up environment**

   ```bash
   cp env.example .env
   # Edit .env with your local values
   ```

4. **Verify hooks are installed**
   ```bash
   ls -la .husky/
   ```

You should see `pre-commit` and `commit-msg` files.

---

## 🔄 Updating Hooks

If you need to update the Git hooks:

1. **Edit the hook files** in `.husky/`
2. **Commit the changes**

   ```bash
   git add .husky/
   git commit -m "chore(git): update pre-commit hook"
   git push
   ```

3. **Team members get updates** automatically on `git pull`

---

## 📚 Related Documentation

- [Commit Conventions](./commit-conventions.md)
- [Git Hooks Quick Reference](./git-hooks-quick-reference.md)
- [Coding Rules](./rules.md)
- [Onboarding Checklist](./onboarding-checklist.md)

---

**Summary:** All Husky files, configuration, and documentation should be committed to Git. Only secrets, dependencies, build artifacts, and personal files should be ignored. This ensures everyone on the team has the same setup! ✅
