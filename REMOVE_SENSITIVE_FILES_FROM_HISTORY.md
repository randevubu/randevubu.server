# Remove Sensitive Files from Git History

## ⚠️ CRITICAL WARNING

**This process will REWRITE Git history!** This means:

- All commit SHAs will change
- All team members will need to re-clone or reset their repositories
- Any open pull requests will need to be recreated
- This cannot be undone once pushed to remote

**Before proceeding:**

1. ✅ Notify ALL team members
2. ✅ Ensure all team members have pushed their work
3. ✅ Create a backup of the repository
4. ✅ Choose a time when no one is actively working

## What We're Removing

The following files/folders contain sensitive information and need to be removed from Git history:

- `docs/` folder (49 files with internal documentation, AWS credentials, API keys)
- `NETGSM_DEBUG_REPORT.md` (contains NetGSM credentials)

## Current Status

✅ **Step 1 Complete**: Added to `.gitignore`
✅ **Step 2 Complete**: Removed from Git tracking (files still exist locally)
⏳ **Step 3 Pending**: Remove from Git history
⏳ **Step 4 Pending**: Force push to remote

## Option A: Using BFG Repo Cleaner (RECOMMENDED - Faster & Safer)

### 1. Install BFG Repo Cleaner

```powershell
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
# Or use chocolatey:
choco install bfg-repo-cleaner
```

### 2. Create a backup

```powershell
cd C:\Users\offic\OneDrive\Desktop
git clone --mirror randevubu.server randevubu.server-backup.git
```

### 3. Run BFG to remove the folders

```powershell
cd C:\Users\offic\OneDrive\Desktop\randevubu.server

# Remove docs folder from all commits
bfg --delete-folders docs

# Remove NETGSM_DEBUG_REPORT.md from all commits
bfg --delete-files NETGSM_DEBUG_REPORT.md
```

### 4. Clean up and garbage collect

```powershell
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 5. Verify the files are gone

```powershell
# This should return nothing
git log --all --oneline --name-only -- docs/
git log --all --oneline --name-only -- NETGSM_DEBUG_REPORT.md
```

### 6. Force push to remote (⚠️ DANGEROUS)

```powershell
# Push to remote (this will rewrite history on GitHub/GitLab)
git push origin --force --all
git push origin --force --tags
```

## Option B: Using git filter-repo (More Control)

### 1. Install git filter-repo

```powershell
pip install git-filter-repo
```

### 2. Create a backup

```powershell
cd C:\Users\offic\OneDrive\Desktop
cp -r randevubu.server randevubu.server-backup
```

### 3. Remove the files

```powershell
cd C:\Users\offic\OneDrive\Desktop\randevubu.server

# Remove docs folder and NETGSM_DEBUG_REPORT.md
git filter-repo --path docs --invert-paths
git filter-repo --path NETGSM_DEBUG_REPORT.md --invert-paths
```

### 4. Re-add remote (filter-repo removes it)

```powershell
git remote add origin https://github.com/YOUR_USERNAME/randevubu.server.git
```

### 5. Force push

```powershell
git push origin --force --all
git push origin --force --tags
```

## Option C: Manual with git filter-branch (Slowest, Most Compatible)

```powershell
git filter-branch --force --index-filter `
  "git rm -rf --cached --ignore-unmatch docs/ NETGSM_DEBUG_REPORT.md" `
  --prune-empty --tag-name-filter cat -- --all

git reflog expire --expire=now --all
git gc --prune=now --aggressive

git push origin --force --all
git push origin --force --tags
```

## After Force Push - Team Member Instructions

Send this to all team members:

```
⚠️ IMPORTANT: Git History Has Been Rewritten

The repository history has been cleaned to remove sensitive files.

Please follow these steps:

1. Commit and push any pending work NOW (before we force push)
2. After the force push, run:

   cd path/to/randevubu.server
   git fetch origin
   git reset --hard origin/main
   git clean -fdx

3. If you have local branches, you'll need to rebase them:

   git checkout your-branch
   git rebase origin/main

4. If rebasing fails, you may need to recreate your branch from the new history
```

## Verification Checklist

After completing the process:

- [ ] Files are in `.gitignore`
- [ ] Files still exist locally in `docs/` folder
- [ ] `git log --all -- docs/` returns nothing
- [ ] `git log --all -- NETGSM_DEBUG_REPORT.md` returns nothing
- [ ] Remote repository has been force-pushed
- [ ] All team members have been notified
- [ ] All team members have reset their local repos

## Alternative: Keep History, Just Hide Going Forward

If rewriting history is too risky, you can:

1. ✅ Keep the current commit (files removed from tracking)
2. ✅ Files are now in `.gitignore`
3. ⚠️ Old commits still contain the files (but they won't appear in new commits)

This is safer but means:

- Anyone who checks out old commits can still see the files
- The files are still in the repository's history
- GitHub/GitLab search might still find them

## Recommended Approach

For a production repository with a team:

1. **If this is a public repository or contains real credentials**: Use Option A (BFG) - it's the safest and fastest
2. **If this is a private repository with a small team**: Consider the "Alternative" approach (just stop tracking, don't rewrite history)
3. **If credentials were exposed**: Change all credentials immediately, regardless of which option you choose

## Need Help?

If you're unsure, I can:

1. Walk you through the process step-by-step
2. Run the commands for you (with your approval)
3. Help notify team members
4. Verify the cleanup was successful
