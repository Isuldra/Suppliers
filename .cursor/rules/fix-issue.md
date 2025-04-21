# Cursor AI Rule: Diagnosing and Fixing Issues (Electron/React/Vite Project)

**Goal:** Systematically diagnose the root cause of `{my query}`, implement a robust and verified fix, and proactively identify related improvements, adhering strictly to `core.md` and project specifics.

---

**Phase 1: Information Gathering & Context Validation (MANDATORY)**

1.  **Understand the Problem:**

    - Re-state the reported issue (`{my query}`) to confirm understanding.
    - Gather specifics: Exact error messages, full stack traces, relevant log snippets (`electron-log`), steps to reproduce, expected vs. actual behavior.

2.  **Verify Environment & Initial Context:**

    - `pwd` to confirm CWD.
    - `git status --porcelain` to check for uncommitted changes that might influence behavior.
    - `cat -n <path>` on the primary file(s) implicated by the error/query to verify existence and get initial context. If not found, STOP and ask.
    - `tree -L 3 --gitignore | cat` focused on the suspected area (`src/main`, `src/renderer`, etc.).

3.  **Check Relevant Logs:**

    - Identify potential log locations (e.g., `app.getPath('userData')/logs/supplier-reminder-app.log`, browser console).
    - Use `read_file` or `cat` to examine recent log entries related to the error/behavior. Note timestamps.

4.  **Check Relevant Configurations (If Build/Runtime Issue Suspected):**
    - Examine `package.json` (`main`, `scripts`, `build` section).
    - Examine `electron.vite.config.ts` (entry points, output dirs, plugins).
    - State if the issue seems related to `dev` or `production/dist` context.

**Phase 2: Deep Dive & Root Cause Analysis (MANDATORY)**

5.  **Analyze Code Execution Flow:**

    - Use `read_file` to thoroughly review code sections identified in Phase 1 (error trace, implicated files).
    - Trace the likely execution path: Identify relevant components (React), functions, hooks, IPC calls (`ipcMain.handle`, `ipcRenderer.invoke`), main vs. renderer logic, state updates, and database interactions (`databaseService`).
    - Verify assumptions against actual code logic. Note discrepancies.

6.  **Formulate & Validate Hypotheses:**

    - Based _only_ on verified evidence, list 2-3 specific, plausible root causes (e.g., "IPC handler error", "Incorrect state update", "Race condition", "Config mismatch in `package.json` main for build", "Type error", "Missing dependency").
    - Use `read_file`, `grep_search`, or `codebase_search` to find _concrete evidence_ supporting or refuting each hypothesis.

7.  **Identify & State Root Cause:** Declare the most likely root cause based on the validated evidence. Explain the reasoning clearly.

**Phase 3: Solution Design & Proposal (MANDATORY Confirmation Required)**

8.  **Consider Solution Context & Constraints:**

    - Is the fix needed in `main`, `renderer`, `preload`, or `shared`?
    - Does it involve IPC? Are types defined in `src/shared/types`?
    - Are there Electron security implications (contextIsolation, nodeIntegration)?
    - Is this related to a specific build context (`dev` vs. `dist`)?

9.  **Search for Existing Patterns/Solutions:**

    - Use `codebase_search` / `grep_search` for reusable functions, hooks, types, error handlers, or utilities. Prioritize reuse.

10. **Propose Solution(s):**
    - **a. Minimal Fix:** Detail the specific `edit_file` change(s) to address the root cause. Explain _why_ it fixes the issue. Use workspace-relative paths.
    - **b. Proactive Enhancements (Optional but Recommended):** Suggest related improvements based on analysis (e.g., adding type safety, refactoring for clarity, improving error messages/logging, updating related documentation). Explain benefits.
    - **c. State Risks/Preconditions:** Mention side effects, dependencies, or if a specific build (`dev` or `dist`) is required to test.
    - **d. Request Confirmation:** Explicitly ask which proposal to implement (minimal fix or fix + enhancements) and request permission before applying `edit_file` changes. _"Should I apply the minimal fix?"_ or _"Should I apply the fix and the suggested refactoring?"_

**Phase 4: Verification (MANDATORY after Fix Implementation)**

11. **Propose Verification Steps:**
    - **a. Code Quality Checks:** Propose running `npm run lint` and `npm run typecheck` (request permission per `user-preferences.md`).
    - **b. Build Check (If Applicable):** Propose running the relevant build command (`npm run build`, `npm run dev`, or `npm run dist`) to ensure the fix integrates correctly (request permission).
    - **c. Functional Tests:** Recommend specific manual steps (user actions, inputs) to verify the fix resolves the original issue _and_ hasn't introduced regressions in related areas. Specify expected outcomes.
    - **d. Log Check:** Suggest checking logs again after testing to confirm the error is gone and no new errors have appeared.

---
