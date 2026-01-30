---
name: git-master
description: Git expert skill. Commits, rebases, history search
argument-hint: "[mode: commit|rebase|history] [options]"
---

# Git Master Skill

Expert skill for Git operations.

## Modes

### COMMIT Mode

Create high-quality commits with well-crafted messages.

**Usage:**
```
/git-master commit
/git-master commit -m "feat: add authentication"
```

**Workflow:**

1. **Analyze Changes**
   ```bash
   git status
   git diff --staged
   git diff
   ```

2. **Detect Style**
   ```bash
   # Analyze recent commit messages
   git log --oneline -20
   ```

3. **Determine Commit Type**
   - `feat`: New feature
   - `fix`: Bug fix
   - `refactor`: Refactoring
   - `docs`: Documentation changes
   - `style`: Formatting
   - `test`: Test additions/modifications
   - `chore`: Build/tool changes

4. **Write Commit Message**
   ```
   <type>(<scope>): <subject>

   <body>

   <footer>
   ```

5. **Execute Commit**
   ```bash
   git add <files>
   git commit -m "<message>"
   ```

### REBASE Mode

Perform interactive rebase non-interactively.

**Usage:**
```
/git-master rebase <base-branch>
/git-master rebase main --squash
```

**Workflow:**

1. **Check Current State**
   ```bash
   git log --oneline <base>..HEAD
   ```

2. **Determine Rebase Strategy**
   - squash: Combine all commits into one
   - fixup: Auto-merge fixup commits
   - reword: Edit messages

3. **Execute Rebase**
   ```bash
   git rebase <base>
   # or
   git rebase -i <base> (with auto script)
   ```

4. **Resolve Conflicts**
   - Identify conflicting files
   - Suggest fixes
   - `git rebase --continue`

### HISTORY_SEARCH Mode

Search Git history for specific changes.

**Usage:**
```
/git-master history "function name"
/git-master history --file src/auth.ts
/git-master history --author "username"
```

**Search Options:**

1. **Code Search**
   ```bash
   git log -S "search term" --oneline
   git log -G "regex pattern" --oneline
   ```

2. **File History**
   ```bash
   git log --follow --oneline -- <file>
   git blame <file>
   ```

3. **Author Search**
   ```bash
   git log --author="name" --oneline
   ```

4. **Date Range**
   ```bash
   git log --since="2025-01-01" --until="2025-01-31"
   ```

## Commit Message Guidelines

### Subject

- 50 characters max
- Don't start with capital letter (conventional commits)
- No period at end
- Imperative mood ("add" not "added")

### Body

- Wrap at 72 characters
- Explain "why" the change is needed
- "What" is explained by the code

### Footer

- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Closes #123`, `Fixes #456`

## Examples

### Feature Addition
```
feat(auth): add JWT token refresh mechanism

Implement automatic token refresh when the access token
expires. The refresh token is stored in httpOnly cookie
for security.

- Add refreshToken endpoint
- Implement token rotation
- Add automatic retry on 401

Closes #234
```

### Bug Fix
```
fix(api): handle null response from external service

The external payment API occasionally returns null instead
of an error object. Add null check and proper error handling.

Fixes #567
```

### Refactoring
```
refactor(database): extract query builder to separate module

Move query building logic to dedicated module for better
testability and reusability.

No functional changes.
```

## Cautions

- Use `--force` only when explicitly requested
- Warn before pushing to `main`/`master`
- Prevent committing sensitive files (.env, credentials)
- Warn about large binary files
