# Documentation Changelog

## Version 1.3.0: Multi-Language Support

_Completed January 2025_

This version introduces comprehensive multi-language support for the OneMed SupplyChain application, making it accessible to users across Nordic countries and English-speaking markets.

### Key Features:

- **Multi-Language Interface Support:**

  - Norwegian (Norsk) - Primary language
  - Swedish (Svenska) - Full interface translation
  - Danish (Dansk) - Complete localization
  - Finnish (Suomi) - Full language support
  - English - International accessibility

- **Language Detection and Selection:**

  - Automatic language detection based on system locale
  - Manual language selector component for user preference
  - Persistent language settings across application sessions

- **Comprehensive Documentation:**

  - Multi-language user guide covering all 5 supported languages
  - End-user focused documentation with clear navigation
  - Developer documentation updates for internationalization

- **Enhanced User Experience:**
  - Localized interface elements throughout the application
  - Language-specific email templates for international suppliers
  - Cultural adaptation of user interface elements

### Technical Implementation:

- **Internationalization Framework:**

  - Integrated i18next and react-i18next for React component translation
  - Language detection service for automatic locale identification
  - Comprehensive translation files for all supported languages

- **Component Updates:**

  - Language selector component for manual language switching
  - Updated all major UI components with translation support
  - Maintained backward compatibility with existing functionality

- **Documentation Structure:**
  - Created `docs/user-guide-multilang.md` with sections for all 5 languages
  - Updated main README.md with prominent end-user documentation links
  - Maintained developer-focused documentation structure

### Files Added/Modified:

**New Files:**

- `docs/user-guide-multilang.md` - Comprehensive multi-language user guide
- `src/renderer/components/LanguageSelector.tsx` - Language selection component
- `src/renderer/services/languageDetectionService.ts` - Automatic language detection
- `src/renderer/i18n/config.ts` - Internationalization configuration
- `src/renderer/locales/` - Translation files for all 5 languages

**Updated Files:**

- `package.json` - Version bump to 1.3.0
- `README.md` - Added end-user documentation section
- `docs/CHANGELOG.md` - Added version 1.3.0 entry
- All renderer components - Added translation support

### Impact:

- **Improved Accessibility**: Application now supports 5 languages, making it accessible to Nordic and international users
- **Enhanced User Experience**: Native language support improves usability and reduces learning curve
- **Professional Documentation**: Comprehensive user guides in all supported languages
- **International Reach**: Enables deployment across different markets and user bases

---

## Phase 7: Email Template Column Header Updates

_Completed December 2024_

This phase updated the email template column headers to better reflect the actual data content, improving clarity for suppliers receiving reminder emails.

### Key Changes:

- **Norwegian Email Template:**

  - Changed column header from "Beskrivelse" to "Lev. ArtNr" to accurately reflect supplier article numbers
  - The column displays data from BP sheet column I (artnrlev) which contains the supplier's article number

- **English Email Template:**

  - Changed column header from "Description" to "Supplier ArtNo" to accurately reflect supplier article numbers
  - The column displays data from BP sheet column I (artnrlev) which contains the supplier's article number

- **Documentation Updates:**
  - Updated `docs/features/email-templates.md` to reflect the new column names
  - Added specification column documentation for both Norwegian and English templates
  - Updated table structure examples to include the new column headers

### Technical Implementation:

- **Email Service Changes (`src/renderer/services/emailService.ts`):**

  - Updated Norwegian template table header on line 85: "Beskrivelse" → "Lev. ArtNr"
  - Updated English template table header on line 164: "Description" → "Supplier ArtNo"
  - No changes to data mapping or template logic required

- **Data Flow Verification:**
  - BP sheet column I (artnrlev) → database field `beskrivelse` → email template `{{description}}`
  - BP sheet column L (orpradtext) → database field `specification` → email template `{{specification}}`
  - Data flow remains unchanged, only column header labels updated

### Impact:

- **Improved Clarity**: Suppliers now see clearer column names that accurately describe the content
- **Better User Experience**: Column headers now match the actual data being displayed
- **No Functional Changes**: Email generation and data mapping remain unchanged
- **Consistent Documentation**: All documentation now reflects the updated column names

### Files Modified:

- `src/renderer/services/emailService.ts` - Updated email template column headers
- `docs/features/email-templates.md` - Updated documentation to reflect new column names
- `docs/CHANGELOG.md` - Added entry documenting the changes

---

## Phase 6: Supplier Selection Logic Unification

_Completed December 2024_

This phase focused on unifying the supplier selection logic between single and bulk modes to ensure consistent data display and eliminate discrepancies.

### Key Changes:

- **SupplierSelect Component (Single Mode) Logic Unification:**

  - **Database Integration**: Now uses `getSuppliersForWeekday()` to fetch suppliers from database instead of hardcoded data
  - **Order Filtering**: Implements same filtering logic as BulkSupplierSelect - only shows suppliers with `outstandingCount > 0`
  - **Data Source Consistency**: Both components now use identical data sources and filtering criteria
  - **Outstanding Order Calculation**: Uses `getAllOrders()` to calculate outstanding orders per supplier

- **BulkSupplierSelect Component (Bulk Mode) - Unchanged:**

  - **Existing Logic Preserved**: Maintains existing database integration and filtering logic
  - **Consistent Behavior**: Already used correct database sources and filtering

- **Result - Identical Logic Implementation:**
  - ✅ **Same Database Source**: Both components use `getSuppliersForWeekday()` for supplier data
  - ✅ **Same Order Source**: Both components use `getAllOrders()` for order data
  - ✅ **Same Filtering**: Both components filter suppliers based on `outstandingCount > 0`
  - ✅ **Same Calculation**: Both components use identical outstanding order calculation logic

### Technical Implementation:

- **SupplierSelect.tsx Changes:**

  - Replaced hardcoded supplier data with database calls
  - Added `getAllOrders()` integration for outstanding order counting
  - Implemented same filtering logic as BulkSupplierSelect
  - Added loading states and error handling for database operations

- **Data Flow Consistency:**
  - Single mode and bulk mode now show identical supplier counts
  - Outstanding order calculations are consistent across both modes
  - Database is the single source of truth for both components

### Impact:

- **Eliminated Discrepancies**: Single and bulk modes now show identical data
- **Improved Data Accuracy**: Both modes use real-time database data
- **Enhanced User Experience**: Consistent behavior across different selection modes
- **Better Maintainability**: Unified logic reduces code duplication and potential bugs

### Files Modified:

- `src/renderer/components/SupplierSelect.tsx` - Updated to use database logic
- `src/renderer/components/BulkSupplierSelect.tsx` - No changes (already correct)
- `src/services/databaseService.ts` - Database service used by both components

---

## Phase 5: Complete Documentation Overhaul

_Completed July 2024_

This phase involved a complete overhaul of the documentation to reflect the current state of the application after major UI/UX improvements and feature additions.

### Key Changes:

- **Complete Documentation Restructure:**

  - **Removed obsolete files**: Deleted `wizard-interface.md`, `order-tracking.md`, `security-features.md`, `external-links.md`, `auto-updates.md`, `end-user-installation.md`, `README-installer.txt`, `onboarding.md`
  - **Updated core documentation**: Completely rewrote `README.md`, `user-guide.md`, `excel-import.md` to reflect current streamlined interface
  - **New documentation**: Created `getting-started.md`, `architecture.md`, `database.md`, `development/setup.md`

- **New Documentation Structure:**

  - **User Guides**: `getting-started.md`, `user-guide.md` - Modern, user-friendly guides
  - **Technical Docs**: `architecture.md`, `database.md` - Comprehensive technical documentation
  - **Development**: `development/setup.md` - Complete development environment setup
  - **Features**: Updated `excel-import.md`, `email-reminders.md`, `email-templates.md` - Current feature documentation

- **Content Improvements:**

  - **Norwegian language**: All documentation now in Norwegian for better user experience
  - **Modern UI/UX**: Documentation reflects current streamlined interface without wizard steps
  - **New features**: Added documentation for progress indicator, keyboard shortcuts, dashboard
  - **Technical accuracy**: All documentation verified against current codebase
  - **Visual improvements**: Added emojis, better formatting, tables, and code examples

- **Key New Features Documented:**

  - **Progress Indicator**: Visual progress tracking through workflow steps
  - **Keyboard Shortcuts**: Complete shortcut reference and help system
  - **Dashboard**: Comprehensive overview and statistics functionality
  - **Streamlined Interface**: Removed wizard navigation, automatic progression
  - **Global State Management**: State persistence across route changes

- **Technical Documentation:**
  - **Architecture**: Complete system architecture with diagrams and data flow
  - **Database**: Comprehensive database schema, operations, and optimization
  - **Development Setup**: Complete development environment setup guide
  - **API Documentation**: IPC communication and database operations

### Documentation Files Status:

**New Files:**

- `getting-started.md` - Quick start guide for new users
- `user-guide.md` - Comprehensive user manual
- `architecture.md` - Technical architecture documentation
- `database.md` - Database structure and operations
- `development/setup.md` - Development environment setup

**Updated Files:**

- `README.md` - Complete rewrite with modern structure
- `excel-import.md` - Updated for current streamlined interface
- `email-reminders.md` - Current e-mail system documentation
- `email-templates.md` - Template system documentation

**Removed Files:**

- `wizard-interface.md` - Obsolete after wizard removal
- `order-tracking.md` - Functionality covered in other docs
- `security-features.md` - Not implemented features
- `external-links.md` - Not implemented features
- `auto-updates.md` - Basic functionality only
- `end-user-installation.md` - Replaced by getting-started.md
- `README-installer.txt` - Obsolete
- `onboarding.md` - Replaced by getting-started.md

### Next Steps:

- **User Testing**: Validate new documentation with actual users
- **Translation**: Consider English translations if needed
- **Video Guides**: Create video tutorials for complex workflows
- **Interactive Help**: Implement in-app help system

---

## Phase 4: Import Debugging & UI Layout

_Completed [Current Date - e.g., 21 Apr 2025]_

This phase focused on resolving critical Excel import bugs and improving UI layout consistency.

### Key Changes:

- **Excel Import (`src/main/importer.ts`):**
  - Refactored `findHeaderRow` helper to use `cell.text` instead of `row.values` for improved reliability with varied cell content (rich text, formulas).
  - Fixed `Hovedliste` processing failure by applying the improved `findHeaderRow`.
  - Fixed `Sjekkliste Leverandører *` processing by dynamically finding the header row using `findHeaderRow` instead of assuming row 4.
  - Fixed numeric date parsing from Excel serial numbers in `Restliste til Leverandør` processing using `XLSX.SSF.parse_date_code` correctly.
  - _Note:_ While `Hovedliste` import now succeeds, logs indicate potential remaining issues with populating the `estMap` from `Restliste` and extracting `weekly_status` data from `Sjekkliste` sheets.
- **UI Layout (`src/renderer/styles/index.css`, `App.tsx`, modals, steps):**
  - Removed `max-w` constraint from `.container-app` in global styles to allow content area to expand.
  - Increased `max-w` on the Email Preview modal (`EmailPreviewModal.tsx`) for better viewing on wider screens.
  - Applied `max-w` and centering (`mx-auto`) to the content block within the Weekday Select step (`WeekdaySelect.tsx`) to improve layout balance.
- **Tooling:**
  - Installed and configured ESLint (v9) with TypeScript and React plugins (`eslint.config.js`). Identified numerous linting issues to be addressed.

### Pending / Next Steps:

- Address remaining Excel import issues (Restliste `estMap`, Sjekkliste data extraction).
- Systematically fix ESLint errors and warnings.
- Further UI refinement pass.

---

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
