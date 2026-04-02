# /code — Ralph Loop Integration

Ralph Loop automates iterative development. Run `/code [iterations]` to let Claude autonomously execute tasks from `Progress.txt`.

## How it works

1. Read `Progress.txt` and find the next task `[ ]`
2. Read `PRD.md` for requirements
3. Implement the task
4. Run validations (lint, type-check, tests)
5. Commit with Conventional Commits
6. Update `Progress.txt` marking task `[x]`
7. Loop to step 1

## Commands

```bash
# Execute 10 iterations of the ralph loop
/code 10

# Execute 5 iterations
/code 5

# Execute 1 iteration (single task)
/code 1
```

## Process per iteration

### 1. Find next task
```
Progress.txt → find first `[ ]` task
```

### 2. Read requirements
```
PRD.md → find User Story and task details
```

### 3. Implement
```
Write code → solve task → test locally
```

### 4. Validate
```
npm run type-check    # TypeScript validation
npm run lint          # ESLint + fix
npm test              # Jest (if applicable)
```

### 5. Commit
```
git add .
git commit -m "feat: task description"    # Conventional Commits
git push origin feat/monitor-onboarding
```

### 6. Update Progress
```
Progress.txt → mark task as [x]
```

## Task guidelines

- Read the **full** task description from `PRD.md`
- Implement in the **correct Sprint** section
- Write **tests** when applicable
- **Commit frequently** (per subtask if large)
- **Don't skip** lint/type-check validation
- **Update Progress.txt** after every task

## Example workflow (Iteration 1)

```
Task T-01: Create repo GitHub + link Vercel
Status:   [ ] → [~] → [x]

Step 1: gh repo create seazone-tech/hackathon-monitordeonboarding --public
Step 2: Verify creation
Step 3: git push origin feat/monitor-onboarding
Step 4: Link to Vercel dashboard
Step 5: npm install (verify no errors)
Step 6: git commit -m "feat: setup GitHub repo + Vercel integration"
Step 7: Update Progress.txt: [T-01] ✓ [x]
```

## Notes

- Sprint 0 includes setup (GitHub, Vercel, Neon, Clerk, .env)
- Sprint 1 includes backend API + database + Nekt polling
- Sprint 2 includes frontend + Stitch integration + data binding
- Sprint 3 includes alerts + testing
- Sprint 4-5 includes deployment + documentation

Use `/code 27` to execute all tasks (Sprint 0-5 complete).
