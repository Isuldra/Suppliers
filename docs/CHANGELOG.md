# Documentation Changelog

## Phase 3: Technical Accuracy Review & Cleanup

_Completed [Current Month/Year - e.g., May 2024]_

This phase involved a detailed review of the existing documentation against the actual codebase and configurations to ensure technical accuracy and consistency.

### Key Changes:

- **Feature Documentation (`docs/features/`) Review:**
  - `email-reminders.md`: Rewritten to accurately reflect manual email triggering via default client, single template, basic history tracking. Removed inaccurate claims of automation, template customization, SMTP/API integration, bulk sending.
  - `excel-import.md`: Updated to reflect `.xlsx` only support, correct usage of `Hovedliste` / `Sjekkliste*` sheets, non-usage of `BP` sheet, actual validation steps, and removal of misleading claims about error handling/ODBC.
  - `supplier-management.md`: **Deleted** as the described CRUD feature does not exist. Requirements moved to `docs/planning/planned-features.md`.
  - `wizard-interface.md`: Verified as accurately describing the current `App.tsx`-based wizard flow.
  - `backup-restore.md`: File did not exist; functionality covered in `database-storage.md`.
  - `database-storage.md`: Verified/corrected regarding schema, initialization, WAL mode, backup implementation (automatic only, no UI restore), and corruption handling.
  - `auto-updates.md`: Verified as accurately describing `electron-updater` usage for checking manually published GitHub releases.
- **Distribution Documentation (`docs/distribution/`) Review:**
  - `DISTRIBUTION.md`: Corrected build output filenames, removed references to deleted PowerShell script.
  - `DISTRIBUTION-OPTIONS.md`: Corrected portable build script/output information, corrected portable data storage location (uses AppData, not local folder).
  - `PORTABLE.md`: Rewritten to align with standard portable build behavior (AppData storage, `.exe` distribution).
  - `install-reminder-pro.ps1`: Deleted as deemed unnecessary.
  - `README.md`: Updated index, removed links to deleted/non-existent files.
- **Installation Documentation (`docs/installation/`) Review:**
  - `end-user-installation.md`: Corrected filenames, portable data storage location/usage, default install path, log path example.
- **Development Documentation (`docs/development/`) Review:**
  - `ci-cd-pipeline.md`: Updated to reflect actual GitHub Actions workflow (missing test/lint steps, direct builder calls, correct artifact details).
  - `publishing-updates.md`: Verified as accurately describing the manual GitHub Release process; added note about uploading `latest.yml`.
- **Root `README.md` Review:**
  - Removed duplicate Security/Development sections.
  - Corrected Automatic Updates configuration description (points to `package.json`, explains `publish: null` context).
  - Updated installation command examples.

### Pending / Next Steps:

- Address missing test/lint steps in CI pipeline (`.github/workflows/build.yml`).
- Review remaining documentation directories (`docs/planning`, `docs/guides`, etc.) if needed.

---

## Phase 2: Structure, Accuracy & Consistency Cleanup

_Completed April 2024 (Adjust date as needed)_

This phase focused on modernizing the documentation structure, ensuring accuracy after the initial rename, and improving overall consistency.

### Key Changes:

- **Global Rename Follow-up:** Ensured consistent use of "SupplyChain OneMed application" and related terms throughout reviewed documents.
- **Structural Cleanup:**
  - Removed empty directories: `docs/api/`, `docs/architecture/`, `docs/troubleshooting/`, `docs/usage/`.
  - Removed outdated/broken index files: `docs/development/README.md`.
- **Installation Documentation:**
  - Consolidated `docs/installation/README.md` and `docs/installation/end-user-installation.md` into a single `docs/installation/installation-guide.md`.
  - Added System Requirements section.
  - Updated installer filenames and clarified steps.
  - Updated `docs/README-installer.txt` for consistency.
- **Development Documentation:**
  - Updated `docs/development/ci-cd-pipeline.md` and `docs/development/publishing-updates.md` to accurately reflect the **manual release publishing process** (removed automated GitHub Release steps, `GH_TOKEN` references).
- **Link Resolution & Consistency:**
  - Fixed broken internal links in reviewed files.
  - Updated main `docs/README.md` and `docs/features/README.md` to accurately index existing documentation files.
- **Content Improvement:**
  - Added introductory paragraphs and clarifications to key documents (`README.md`, installation guide, development guides).
  - Removed redundant sections (e.g., duplicate Security/Dev Tools in main `README.md`).

### Pending / Next Steps:

- **Code Validation:** Detailed review of feature documentation (`docs/features/*.md`) against the current codebase to ensure technical accuracy (Potential Phase 3).
- **Configuration File Validation:** Verification of scripts, paths, and settings mentioned in development docs (`ci-cd-pipeline.md`, `publishing-updates.md`) against actual project files (`package.json`, `.github/workflows/*.yml`, `electron-builder.yml`).
