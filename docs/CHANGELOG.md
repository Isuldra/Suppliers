# Documentation Changelog

## Versjon 1.4.1: Kritisk Windows Installasjonsfix

_November 2025_

Denne versjonen løser et kritisk problem med Windows-installasjon hvor programmet ikke kunne finnes etter installasjon.

### Kritiske Bugfixes

#### Windows Installasjonsproblem Løst

**Problem:**

- Brukere rapporterte at Pulse installerte vellykket, men programmet kunne ikke finnes i Start-menyen eller på skrivebordet
- Årsak: Installer-scriptet prøvde å skrive til `HKEY_LOCAL_MACHINE` (system registry) uten administratorrettigheter
- Dette førte til at registry-oppføringer og Start-meny-snarveier ikke ble opprettet

**Løsning:**

- **Registry-nøkler endret**: Endret alle `HKLM` (HKEY_LOCAL_MACHINE) til `HKCU` (HKEY_CURRENT_USER) i `resources/installer.nsh`
- **Eksplisitt snarvei-opprettelse**: Lagt til eksplisitt opprettelse av Start-meny-snarveier for å sikre at de alltid blir laget
- **Konsistent med konfigurasjonen**: Nå samsvarer installer-scriptet med `perMachine: false` innstillingen i `package.json`

**Endrede filer:**

- `resources/installer.nsh`:
  - Linje 67-84: Endret registry-nøkler fra HKLM til HKCU
  - Linje 62-65: Lagt til eksplisitt opprettelse av Start-meny-snarveier
  - Linje 96-97: Endret uninstall registry cleanup fra HKLM til HKCU
  - Linje 109-112: Lagt til cleanup av Start-meny-snarveier ved avinstallasjon

**Dokumentasjon:**

- Opprettet `docs/distribution/WINDOWS-TROUBLESHOOTING.md` med omfattende feilsøkingsguide
- Dokumenterer problemet, løsningen, og hvordan brukere kan fikse eksisterende installasjoner
- Inkluderer manuelle løsninger for å finne og kjøre programmet hvis det allerede er installert

### Påvirkning

**Før denne fixen:**

- Registry-oppføringer feilet å bli opprettet (krever admin-rettigheter)
- Start-meny-snarveier kunne feile
- Programmet ble installert, men Windows kunne ikke finne det
- Brukere måtte manuelt navigere til `%LOCALAPPDATA%\Programs\Pulse\` for å finne programmet

**Etter denne fixen:**

- Registry-oppføringer opprettes korrekt for gjeldende bruker
- Start-meny-snarveier opprettes alltid
- Programmet vises i Start-menyen som forventet
- Normal Windows-installasjonsopplevelse

### Anbefaling

Alle brukere som har installert versjon 1.4.0 eller tidligere bør:

1. Avinstallere eksisterende versjon
2. Installere versjon 1.4.1 eller nyere

For eksisterende installasjoner som ikke vises i Start-menyen, se `docs/distribution/WINDOWS-TROUBLESHOOTING.md` for manuelle løsninger.

---

## Versjon 1.3.9: Repository Cleanup & Applikasjonsnavnendring

_Fullført November 2025_

Denne versjonen fokuserer på repository cleanup, kodeorganisering og applikasjonsnavnendring fra "OneMed SupplyChain" til "Pulse".

### Repository Cleanup

#### Git Repository Størrelsesreduksjon

- **Fjernet Store Binærfiler**: Slettet 260+ MB med `.exe`-filer fra `docs/updates/` mappen
- **Backup Opprettet**: Alle fjernede filer sikkerhetskopiert til `backup/exe-files/` mappen
- **Git Strategi**: Bekreftet GitHub Releases som distribusjonsmetode (ingen Git LFS nødvendig)
- **Verifisering**: Bekreftet at `dist/` og `release/` mapper er korrekt gitignored

#### Duplikatfiler Fjernet

- **Ikonfiler**: Fjernet 7 duplikate `temp-*.png` ikonfiler fra `resources/` mappen
- **App Ikoner**: Konsolidert app ikoner (`supplychain.png`, `supplychain.ico`) til `resources/` mappen
- **Kodeoppdateringer**: Oppdatert `src/main/index.ts` til å referere til konsoliderte ikonstier

#### Kodeorganisering

- **E-postmaler**: Konsolidert e-postmaler til `src/services/emailTemplates/`
  - Fjernet duplikat mal fra `src/renderer/services/emailTemplates/`
  - Build script bruker allerede korrekt sti, ingen kodeendringer nødvendig
- **Scripts Dokumentasjon**: Opprettet omfattende `scripts/README.md` som dokumenterer alle 27 scripts
  - Kategorisert scripts: Build, Version, Release, Testing, Deployment, Utilities
  - Identifisert 7 deprecated scripts (dokumentert, ikke slettet)
  - Flyttet `troubleshoot-native-modules.md` til `docs/development/`
- **AI Kontekst Optimalisering**: Lagt til `.cursorignore` fil for å ekskludere build artifacts fra AI kontekst
  - Ekskluderer: `dist/`, `release/`, `node_modules/`, `*.exe`, `*.dll`, `*.pak`, `coverage/`

### Applikasjonsnavnendring

#### Omdøping til "Pulse"

- **Package Konfigurasjon**: Oppdatert `package.json`:
  - `productName`: Endret fra "OneMed SupplyChain" til "Pulse"
  - `description`: Oppdatert til "Pulse - Desktop application..."
  - `shortcutName`: Oppdatert Windows snarveier til "Pulse"
- **Kildekode Oppdateringer**: Oppdatert alle referanser gjennom hele kodebasen:
  - Main process filer (`src/main/index.ts`, `src/main/main.ts`, `src/main/auto-updater.ts`)
  - Renderer komponenter og locales (5 språk: no, en, se, da, fi)
  - E-postservice headers og meldinger
- **Build Scripts**: Oppdatert artifact navn:
  - Installer: `Pulse-{version}-setup.exe` (var `OneMed SupplyChain-{version}-setup.exe`)
  - Portable: `Pulse-Portable.exe` (var `OneMed SupplyChain-Portable.exe`)
  - Oppdatert `prepare-cloudflare-release.js`, `create-github-release.js`, `generate-latest-json.js`
- **Installer Konfigurasjon**: Oppdatert `resources/installer.nsh`:
  - Registry nøkler endret til å bruke "Pulse"
  - Skrivebordssnarveier oppdatert
  - Avinstallerings registry oppføringer oppdatert
- **HTML Filer**: Oppdatert `docs/updates/index.html` og `docs/updates/404.html`

### Påvirkning

- **Repository Størrelse**: Redusert med 260+ MB (fjernet store binærfiler)
- **Kodeorganisering**: Forbedret struktur med konsoliderte maler og dokumenterte scripts
- **Utvikleropplevelse**: Raskere AI kontekst prosessering med `.cursorignore`
- **Konsistens**: Enhetlig applikasjonsnavngiving gjennom hele kodebasen
- **Vedlikeholdbarhet**: Bedre dokumentasjon og organisering

### Breaking Changes

- **Artifact Navn**: Build artifacts bruker nå "Pulse" navngiving i stedet for "OneMed SupplyChain"
  - Eksisterende auto-update URLs må oppdateres
  - Manuelle installasjoner vil bruke ny navngivingskonvensjon
- **Windows Registry**: Registry nøkler endret fra "OneMed SupplyChain" til "Pulse"
  - Kan kreve reinstallasjon for korrekt registry opprydding

### Tekniske Notater

- Alle cleanup oppgaver sporet i `docs/cleanup/backlog.md` og `docs/cleanup/state.yaml`
- Commits følger atomisk mønster for enkel rollback hvis nødvendig
- Ingen funksjonelle endringer - kun organisatoriske og navngivingsoppdateringer

---

## Version 1.4.0: Dashboard Enhancement & Product Catalog Integration

_Completed November 2025_

This version introduces comprehensive dashboard improvements with advanced KPIs, Supabase cloud integration for product catalog, and a new tabbed interface for better data visualization.

### Major Features:

#### Enhanced Dashboard KPIs

- **New Performance Metrics**:
  - Gjennomsnittlig forsinkelse (Average delay in days)
  - Kritisk forsinkede ordre (Orders delayed >30 days)
  - On-Time Delivery Rate (Percentage of orders delivered on time)
  - Eldste utestående ordre (Oldest outstanding order date)
  - Totalt restlinjer (Total outstanding lines, not pieces)

- **Improved Data Accuracy**:
  - KPIs now measure by number of lines instead of quantity/pieces
  - More relevant metrics based on actual BP sheet data
  - Real-time calculations using SQLite queries

#### Tabbed Dashboard Interface

- **Oversikt Tab**:
  - 6 key performance indicators
  - Top 5 suppliers by outstanding lines
  - Enhanced tooltips with delay and on-time delivery metrics

- **Varenummer Tab** (NEW):
  - Display top 200 items with outstanding quantities
  - Full product names from Supabase catalog
  - Real-time search functionality across item numbers and product names
  - Sortable columns: Item No., Product Name, Quantity, Lines, Suppliers
  - Dynamic filtering with result count

- **Timeline Tab**:
  - Weekly overview of orders
  - Moved from Oversikt tab for better organization

#### Supabase Product Catalog Integration

- **Cloud-Based Product Names**:
  - 10,000+ products stored in Supabase
  - Automatic synchronization on app startup
  - Local caching for fast lookups (5-minute TTL)
  - Fallback to BP description if product not found

- **Excel Upload Feature**:
  - Drag-and-drop interface in Settings modal
  - Parse Produktkatalog.xlsx (Column A: Item No., Column C: Item description)
  - Batch upload (1000 products at a time)
  - Replace existing catalog with new data
  - Sync status display with product count and last sync time

- **Row Level Security**:
  - Proper RLS policies for secure access
  - Public read/write access for internal use
  - Environment variable configuration for credentials

#### Database Enhancements

- **New Database Methods**:
  - `getTopItemsByOutstanding(limit)`: Fetch top items with quantities and supplier counts
  - `getDashboardStats()`: Extended with new KPI calculations
  - `getTopSuppliersByOutstanding()`: Now sorts by line count instead of quantity
  - `getSupplierDetails(supplierName)`: Detailed supplier statistics

- **Advanced SQL Queries**:
  - AVG delay calculations for overdue orders
  - COUNT of critically delayed orders (>30 days)
  - On-time delivery rate calculations
  - MIN date for oldest outstanding order

#### UI/UX Improvements

- **TopItemsTable Component**:
  - Responsive design with mobile-friendly layout
  - Large search field with instant filtering
  - Color-coded table rows for better readability
  - "No results" message when search returns empty
  - Dynamic result counter

- **TopSuppliersChart Component**:
  - Updated to show line count instead of quantity
  - Enhanced tooltips with average delay and on-time delivery percentage
  - Better data visualization

- **Settings Modal**:
  - New "Produktkatalog" section
  - Sync status indicator
  - Manual sync button
  - Drag-and-drop file upload area with visual feedback
  - Success/error message display

### Security & Configuration

- **Environment Variables**:
  - `.env.example` template for Supabase credentials
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Secure credential management
  - `.gitignore` updated to exclude `.env`

- **Lazy Initialization**:
  - Supabase client initialized only when needed
  - Graceful fallback if not configured
  - No app crashes if Supabase unavailable

### 🐛 Bug Fixes

- Fixed infinite loop issue when selecting suppliers from dashboard
- Resolved "postgresclient is not a constructor" error with dynamic imports
- Fixed TypeScript/ESLint errors for Supabase client
- Removed navigation logic that caused re-render loops

### Dependencies

- **New**: `@supabase/supabase-js` - Cloud database integration

### Breaking Changes

- Dashboard filter navigation temporarily disabled to prevent infinite loops
- KPIs now measure lines instead of pieces (more accurate representation)

### Technical Notes

- Supabase table: `product_catalog` with indexes on `item_no` and `item_name`
- Product catalog enrichment happens at IPC handler level
- Local cache prevents excessive API calls
- Background sync on app startup (non-blocking)

---

## Version 1.3.8: Complete Visual Redesign & UI Improvements

_Completed November 2025_

This version introduces a comprehensive visual redesign with glassmorphism effects, improved spacing, and enhanced user experience across the application.

### Key Features:

#### Bulk Email Preview UI Overhaul

- **Wider Container**: Expanded bulk mode container from `max-w-4xl` to `max-w-7xl` for better content visibility
- **Glassmorphism Design**: Complete glassmorphism implementation with:
  - Mesh/radial gradient background for depth
  - Enhanced glass effects on cards (`backdrop-blur-xl`, `bg-white/50-70`)
  - Glass-styled input fields with focus states
  - Glass-styled buttons with hover effects
  - Improved visual hierarchy with layered glass elements
- **Text Contrast**: Enhanced text readability with `text-slate-900/800` instead of `text-neutral`
- **Responsive Design**: Added responsive max-width classes (`max-w-7xl lg:max-w-6xl md:max-w-4xl`)

#### Header Navigation Standardization

- **Consistent Heights**: All navigation buttons now use `h-11` for uniform appearance
- **Glassmorphism Styling**: All header buttons feature glassmorphism effects:
  - Gradient backgrounds (`bg-gradient-to-br from-white/30 to-white/20`)
  - Enhanced blur effects (`backdrop-blur-xl`)
  - Hover animations (`hover:scale-105 active:scale-95`)
  - Consistent shadows and borders
- **Visual Grouping**: Improved visual separation and grouping of navigation elements
- **Icon Consistency**: All icons (Dashboard, Settings, Keyboard Shortcuts, Language) now have matching styling

### Technical Implementation:

#### Background Improvements

- **Mesh Gradients**: Replaced flat gradient with layered radial gradients:
  - `radial-gradient(circle at 20% 30%, rgba(236, 72, 153, 0.3))`
  - `radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3))`
  - `radial-gradient(circle at 50% 50%, rgba(147, 197, 253, 0.2))`
  - Base `linear-gradient(135deg, #fce7f3 0%, #ddd6fe 50%, #cbd5e1 100%)`

#### Component Updates

- **BulkEmailPreview.tsx**:
  - Summary section: `bg-white/70 backdrop-blur-2xl`
  - Supplier cards: `bg-white/40 backdrop-blur-md`
  - Input fields: `bg-white/60 backdrop-blur-md` with focus states
  - Buttons: Glass-styled with teal accents for primary actions
- **App.tsx**:
  - Responsive container with conditional max-width based on bulk mode
  - Enhanced background with mesh gradients
- **LanguageSelector.tsx**:
  - Standardized to `h-11 w-11` with glassmorphism styling
  - Improved flag icon presentation

### Visual Impact:

- **Better Content Visibility**: No more content truncation in bulk mode
- **Professional Appearance**: Modern glassmorphism design matches contemporary UI trends
- **Improved Readability**: Enhanced text contrast improves accessibility
- **Consistent Design Language**: Unified styling across all components
- **Better User Experience**: Wider containers and improved spacing reduce cognitive load

### Files Modified:

**Core Components:**

- `src/renderer/App.tsx` - Background gradients, responsive container, header navigation
- `src/renderer/components/BulkEmailPreview.tsx` - Complete glassmorphism redesign
- `src/renderer/components/LanguageSelector.tsx` - Standardized button styling
- `src/renderer/components/Dashboard.tsx` - Visual updates
- `src/renderer/components/EmailPreviewModal.tsx` - Visual updates
- `src/renderer/components/SettingsModal.tsx` - Visual updates
- `src/renderer/locales/*.json` - Translation updates
- `tailwind.config.js` - Configuration updates

### Impact:

- **Improved Usability**: Wider containers prevent content truncation
- **Enhanced Aesthetics**: Modern glassmorphism design improves visual appeal
- **Better Accessibility**: Improved text contrast enhances readability
- **Professional UI**: Consistent design language throughout the application
- **Responsive Design**: Better adaptation to different screen sizes

### Breaking Changes:

None - This is a purely visual update with no functional changes.

### Migration Notes:

No migration required - all changes are backward compatible.

---

## Version 1.3.0: Multi-Language Support

_Completed October 2025_

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

_Completed October 2025_

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

_Completed October 2025_

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
  - **Same Database Source**: Both components use `getSuppliersForWeekday()` for supplier data
  - **Same Order Source**: Both components use `getAllOrders()` for order data
  - **Same Filtering**: Both components filter suppliers based on `outstandingCount > 0`
  - **Same Calculation**: Both components use identical outstanding order calculation logic

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

_Completed July 2025_

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

_Completed April 2025_

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

_Completed April 2025_

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

_Completed April 2025_

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
