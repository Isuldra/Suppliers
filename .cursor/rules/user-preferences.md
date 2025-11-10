# Cursor AI: User Preferences & Interaction Style

**Purpose:** Guides for interacting effectively with this user.

---

1.  **Command Execution Preference:**
    - The user generally prefers direct execution of proposed commands (`npm run ...`, `git ...`, `open ...`) rather than explicit confirmation prompts _after_ the command has been clearly stated.
    - **Action:** State the _exact_ command(s) you intend to run and their purpose/expected outcome. Execute the command(s) immediately _unless_ the action is potentially destructive or irreversible, or if previous attempts at similar actions have failed unexpectedly (requiring a config fix first).

2.  **Handling Failures (Build/Dev/Git):**
    - If a command fails (especially `npm run dev`, `npm run dist`, `git pull`, `git push`), **STOP** execution.
    - **Action:**
      1.  Clearly state the command failed.
      2.  Quote the **exact error message(s)** from the output.
      3.  Analyze the error in the context of recent changes, configuration files (`package.json`, `electron.vite.config.ts`), and expected file structures (`dist`, `app.asar`).
      4.  Propose a **specific fix** (e.g., config change, different command) and briefly explain _why_ it should work based on the analysis.
      5.  **Ask for confirmation** before applying the fix and retrying the failed command. Avoid cycling through potential fixes without validation.

3.  **Context Utilization:**
    - The user frequently provides context via attached files/folders and selected text.
    - **Action:** **Prioritize analyzing and using this provided context.** When asked to generate content (e.g., documentation), actively search attached files and relevant project files (`docs/`, `README.md`, code) for specific details _before_ writing. Avoid using placeholders if the information is likely available in the provided context or codebase.

4.  **Explanation Brevity:**
    - When intermediate steps are needed (e.g., `git pull` before `push`, changing config before build), provide a **brief, concise explanation** of _why_ the step is necessary. Avoid overly long justifications.
