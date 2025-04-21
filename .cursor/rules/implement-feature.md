# Cursor AI Rule: Implementing Features/Requests (Electron/React/Vite Project)

**Goal:** Implement `{my request}` safely, efficiently, and according to project best practices, ensuring proper integration, verification, and documentation.

---

**Phase 1: Understanding & Context Validation (MANDATORY)**

1.  **Clarify the Goal:**

    - Re-state your understanding of the core objective of `{my request}`.
    - Identify the primary user benefit or workflow improvement.
    - If ambiguity exists (scope, specific behavior), **STOP and ask clarifying questions**. Do not make assumptions.

2.  **Identify Scope & Affected Areas:**

    - Determine which parts of the application are likely affected: `main` process, `renderer` process (UI), `preload` script, `shared` code/types, `databaseService`, configuration files (`package.json`, `vite.config`), documentation (`docs/`).
    - State the anticipated scope.

3.  **Validate Environment & Existing Code:**
    - `pwd` to confirm CWD.
    - `git status --porcelain` to identify unrelated local changes.
    - `tree -L 3 --gitignore | cat` focused on affected areas.
    - If modifying existing code, use `read_file` or `cat -n` to examine the current implementation and ensure understanding.

**Phase 2: Design & Analysis (MANDATORY)**

4.  **Architectural Considerations:**

    - Where should the core logic reside (main, renderer, shared service)?
    - Is Inter-Process Communication (IPC) required? If so, define the channel and data structure (`ipcMain.handle`/`contextBridge.exposeInMainWorld`).
    - Are new database operations needed? Update `databaseService.ts` and relevant types.
    - Does this involve native Electron APIs (dialogs, shell, file system)? Consider security implications.
    - How does this fit with the existing React component structure and state management?

5.  **Code Reusability & Consistency:**

    - **CRITICAL: Search First.** Use `codebase_search` / `grep_search` extensively to find existing components, hooks, utilities, types (`src/shared/types`), services, or constants that can be reused or adapted. **Prioritize reuse.**
    - Ensure the implementation follows existing patterns (e.g., database access via `databaseService`, styling with Tailwind/`cn`).

6.  **Configuration & Dependencies:**

    - Are new `npm` dependencies needed? If so, identify and justify them.
    - Does the feature require changes to `package.json` (scripts, build config) or `electron.vite.config.ts`?

7.  **Error Handling & Logging:**

    - Plan for potential errors. How will they be caught, logged (`electron-log`), and presented to the user (if necessary)?

8.  **Consider Alternatives & Enhancements (Optional but Recommended):**
    - Is there a simpler, more performant, or more maintainable approach?
    - Does this request present an opportunity for minor refactoring or applying a better pattern?

**Phase 3: Implementation Plan & Proposal (MANDATORY Confirmation Required)**

9.  **Outline Implementation Steps:** Briefly list the sequence of actions (e.g., "1. Add IPC handler in main. 2. Expose via preload. 3. Create React component. 4. Call from UI.").

10. **Propose Code Changes:**

    - Detail the specific `edit_file` operations (new files, modifications to existing files). Include code snippets for clarity. Use workspace-relative paths.
    - If alternatives/enhancements were identified (Step 8), present them clearly alongside the direct implementation (e.g., "Proposal 1: Direct... Proposal 2: Using reusable hook..."). Explain trade-offs.

11. **State Dependencies & Risks:** Mention new npm packages, necessary configuration changes, or potential impacts on other features.

12. **Request Confirmation:** Explicitly ask which proposal (if multiple) to proceed with and request permission before applying `edit_file` changes. _"Should I proceed with implementing Proposal 1?"_

**Phase 4: Verification (MANDATORY after Implementation)**

13. **Propose Verification Steps:**
    - **a. Code Quality Checks:** Propose running `npm run lint` and `npm run typecheck` (request permission per `user-preferences.md`).
    - **b. Build Checks:** Propose running `npm run build` and potentially `npm run dist` to ensure the changes integrate correctly (request permission).
    - **c. Functional Tests:** Recommend specific manual steps or testing scenarios to confirm the new feature works as expected across relevant cases (happy path, edge cases, error conditions).
    - **d. Documentation Update:** Propose specific updates needed for `README.md`, `docs/features/`, or other relevant documentation. Offer to make these changes via `edit_file` (request permission).

---
