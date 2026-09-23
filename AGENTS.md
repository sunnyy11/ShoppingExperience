# AGENTS.md - Project Conventions

## Pre-commit Hook Setup

This project uses a pre-commit hook to automatically format code with Prettier before every commit.

### Activate the hook (first time setup):

```bash
cp hooks/pre-commit .git/hooks/pre-commit
```

### What the hook does:

1. Runs `npx prettier --write .` to format all files
2. Auto-stages any files that were reformatted
3. Allows the commit to proceed

This ensures Prettier formatting issues never reach CI.
