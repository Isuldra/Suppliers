<!-- 7e7ad426-79eb-41f1-b683-125171385231 59761227-67d1-4a9f-ba1f-2c537250f6f6 -->
# Multi-language Documentation and Version Update

## Overview

Create end-user documentation in all 5 supported languages, update project documentation, bump version to 1.3.0, and push all changes to Git.

## Supported Languages

Based on `src/renderer/i18n/config.ts`:

- Norwegian (no)
- Swedish (se)
- Danish (da)
- Finnish (fi)
- English (en)

## Implementation Steps

### 1. Translate Dashboard Component

Update `src/renderer/components/Dashboard.tsx` to use i18n translations:

- Replace all hardcoded Norwegian strings (lines 80, 161, 182, 225, 235, 239, 261, 271, 294, 322, 350, 378, 393, 433, 444)
- Add translation keys to all 5 locale files (no.json, se.json, da.json, fi.json, en.json)
- Translation keys needed:
  - Error messages ("Kunne ikke hente leverandørdata", "Ukjent feil")
  - UI labels ("Tilbake til hovedside", "Dashboard", "Prøv igjen")
  - Stats labels ("Totalt leverandører", "Leverandører med åpne ordre", "Totalt åpne ordre", "Totalt restantall")
  - Chart titles ("Topp 5 leverandører - Restantall", "Ordre per ukedag")
  - Weekday names (Mandag, Tirsdag, etc.)
  - Loading/error states

Note: Dashboard needs more work beyond translations (marked as WIP in component)

### 2. Create User Guides for All Languages

Create a single user guide file with sections for each language at `docs/user-guide-multilang.md`:

- Section structure: Each language separated by clear headers
- Content: Installation (NSIS/Portable), basic usage, dashboard, email system, troubleshooting
- Focus: End-user perspective, no Git/development instructions
- Base content on existing `docs/user-guide.md` (Norwegian version already exists)

### 2. Update Main README.md

- Keep developer-focused content
- Add prominent link to end-user documentation at the top
- Update version references
- Link to the new multi-language user guide

### 3. Update Version to 1.3.0

Files to update:

- `package.json` (version field)
- `docs/user-guide.md` (version footer)
- `docs/CHANGELOG.md` (add new entry for 1.3.0 with language support feature)

### 4. Verify Cloudflare Pages Configuration

- Check `package.json` publish URL points to Cloudflare Pages
- Verify `scripts/simple-cloudflare-deploy.js` exists
- Ensure auto-deploy on push is configured (no manual deployment needed)

### 5. Git Commit and Push

Stage all changes:

- New/modified documentation files
- Updated version numbers
- All language support files (locales, i18n config, components)
- package.json and package-lock.json changes

Commit message structure:

```
feat: Add multi-language support (v1.3.0)

- Add support for Norwegian, Swedish, Danish, Finnish, and English
- Create comprehensive user guides in all 5 languages
- Update documentation and version to 1.3.0
- Add language selector component and detection service
```

Push to origin/main - Cloudflare Pages will auto-deploy

## Key Files

- `docs/user-guide-multilang.md` (new)
- `README.md` (update)
- `package.json` (version bump)
- `docs/CHANGELOG.md` (add entry)
- All modified renderer files (already changed)

### To-dos

- [ ] Create comprehensive user guide with all 5 language sections in a single file
- [ ] Update main README.md with end-user documentation links while keeping developer focus
- [ ] Update version to 1.3.0 in package.json and update CHANGELOG.md
- [ ] Verify Cloudflare Pages auto-deploy configuration
- [ ] Stage all changes, commit with structured message, and push to origin/main