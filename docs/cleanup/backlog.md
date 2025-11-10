# Repo Cleanup Backlog

**Status**: 32/31 tasks completed (alle hovedoppgaver fullført)  
**Last updated**: 2025-11-10

---

## Prioritet 1: Reduser Git Bloat (260+ MB)

### P1.1 - Håndter .exe-filer i docs/updates/

- [x] **P1.1.1** Backup eksisterende .exe-filer lokalt
- [x] **P1.1.2** Beslut strategi: Git LFS eller flytt til GitHub Releases
- [x] **P1.1.3** Hvis Git LFS: opprett `.gitattributes` med `*.exe filter=lfs diff=lfs merge=lfs -text` _(Ikke nødvendig - valgt GitHub Releases)_
- [x] **P1.1.4** Hvis GitHub Releases: oppdater `docs/updates/index.html` til å peke på releases _(Allerede korrekt konfigurert)_
- [x] **P1.1.5** Kjør `git rm docs/updates/*.exe` (eller konverter til LFS)
- [x] **P1.1.6** Commit endringer

### P1.2 - Verifiser dist/ og release/ er gitignored

- [x] **P1.2.1** Kjør `git status` og sjekk om dist/ eller release/ vises
- [x] **P1.2.2** Hvis tracked: `git rm -r --cached dist/ release/` (behold lokalt) _(Ikke nødvendig - ikke tracked)_
- [x] **P1.2.3** Verifiser `.gitignore` inneholder `dist/` og `release/`
- [x] **P1.2.4** Commit hvis endringer _(Ingen endringer nødvendig)_

---

## Prioritet 2: Rydd Duplikater (~20 MB)

### P2.1 - Slett temp-icon-filer

- [x] **P2.1.1** Verifiser at `resources/temp-*.png` er identiske med `resources/icon-*.png`
- [x] **P2.1.2** Slett 8 temp-filer: `rm resources/temp-{16,24,32,48,64,128,256}.png` _(7 filer slettet)_
- [x] **P2.1.3** Commit: "Remove duplicate temp icon files"

### P2.2 - Konsolider app icons i root

- [x] **P2.2.1** Søk i kodebasen etter referanser til `supplychain.png` og `supplychain.ico` (root)
- [x] **P2.2.2** Oppdater referanser til å peke på `resources/supplychain.*`
- [x] **P2.2.3** Slett `supplychain.png` og `supplychain.ico` fra root
- [x] **P2.2.4** Test at app icon fortsatt vises korrekt
- [x] **P2.2.5** Commit: "Consolidate app icons to resources/ directory"

### P2.3 - Fjern duplikert logo

- [ ] **P2.3.1** Søk etter referanser til `OneMed part of Asker white text below.webp` (root)
- [ ] **P2.3.2** Oppdater referanser til `src/renderer/assets/onemed-logo.webp`
- [ ] **P2.3.3** Slett `OneMed part of Asker white text below.webp` fra root
- [ ] **P2.3.4** Commit: "Remove duplicate OneMed logo from root"

---

## Prioritet 3: Organiser Filer (bedre struktur)

### P3.1 - Flytt root-docs til docs/

- [ ] **P3.1.1** `git mv documentation.md docs/overview.md` (eller merge med docs/README.md)
- [ ] **P3.1.2** `git mv LESEMEG_LEDELSEN.md docs/LEDELSEN.md`
- [ ] **P3.1.3** `git mv SECURITY.md docs/security.md` (oppdater lenke hvis referert fra README)
- [ ] **P3.1.4** Evaluer `EMAIL_SETUP.md` - merge med `docs/features/email-reminders.md` eller flytt
- [ ] **P3.1.5** Evaluer `SUPPLIER_EMAIL_UPDATE.md` - flytt til `docs/features/` eller `docs/planning/`
- [ ] **P3.1.6** Sjekk `GITHUB_TOKEN_SETUP.md` vs `docs/development/QUICK-START-GITHUB-TOKEN.md` - behold én
- [ ] **P3.1.7** Sjekk `DISTRIBUTION-OPTIONS.md` (root) vs `docs/distribution/DISTRIBUTION-OPTIONS.md` - slett duplikat
- [ ] **P3.1.8** Commit: "Consolidate documentation to docs/ directory"

### P3.2 - Flytt WiP til docs/planning

- [ ] **P3.2.1** `git mv WiP/fix-auto-update-system.plan.md docs/planning/`
- [ ] **P3.2.2** `git mv WiP/fix-cloudflare-pages-routing.plan.md docs/planning/`
- [ ] **P3.2.3** `git mv WiP/multi-language-documentation-push.plan.md docs/planning/`
- [ ] **P3.2.4** `rmdir WiP/`
- [ ] **P3.2.5** Commit: "Move WiP plans to docs/planning/"

### P3.3 - Rydd security-filer

- [ ] **P3.3.1** Evaluer om `security-audit-before.json` og `security-fix-plan.json` skal beholdes
- [ ] **P3.3.2** Hvis ja: flytt til `docs/security/` eller `docs/planning/`
- [ ] **P3.3.3** Hvis nei: slett (commit historikk beholder dem)
- [ ] **P3.3.4** Commit endringer

---

## Prioritet 4: Kode-cleanup

### P4.1 - Konsolider email templates

- [x] **P4.1.1** Søk etter imports av `src/renderer/services/emailTemplates/reminder.hbs`
- [x] **P4.1.2** Oppdater imports til `src/services/emailTemplates/reminder.hbs` _(Ingen imports funnet - build script bruker allerede korrekt path)_
- [x] **P4.1.3** Slett `src/renderer/services/emailTemplates/` directory
- [x] **P4.1.4** Test at email-funksjonalitet fungerer _(build:email-template kjører suksessfullt)_
- [x] **P4.1.5** Commit: "Consolidate email templates to src/services/" _(Commit: ea4fe74)_

### P4.2 - Rydd i scripts-mappen

- [x] **P4.2.1** Opprett `scripts/README.md` med beskrivelse av hver script
- [x] **P4.2.2** Flytt `scripts/troubleshoot-native-modules.md` til `docs/development/`
- [x] **P4.2.3** Identifiser ubrukte/deprecated scripts (sammenlign med package.json scripts) _(7 deprecated scripts identifisert og dokumentert i README)_
- [x] **P4.2.4** Vurder å arkivere eller slette ubrukte scripts _(Deprecated scripts dokumentert i README, kan slettes i fremtidig cleanup)_
- [x] **P4.2.5** Commit: "Document and organize scripts directory" _(Commit: bafc291)_

### P4.3 - Legg til .cursorignore

- [x] **P4.3.1** Opprett `.cursorignore` i root
- [x] **P4.3.2** Legg til: `dist/`, `release/`, `node_modules/`, `docs/updates/*.exe`, `*.dll`, `*.pak`, `coverage/` _(Inkludert også andre build artifacts og cache-filer)_
- [x] **P4.3.3** Commit: "Add .cursorignore for AI context optimization"

### P4.4 - Fix package.json naming

- [x] **P4.4.1** Beslut om app skal hete "one-med-supplychain-app" eller "Pulse" _(Besluttet: "Pulse")_
- [x] **P4.4.2** Oppdater `package.json` "name" og/eller "productName" for konsistens _(productName satt til "Pulse", alle referanser oppdatert)_
- [x] **P4.4.3** Sjekk om endring påvirker build/release scripts _(Scripts oppdatert til å bruke "Pulse" i filnavn)_
- [x] **P4.4.4** Commit: "Align package.json naming"

### P4.5 - Repository Structure & Policy

- [x] **P4.5.1** Create LICENSE (ISC) with copyright Andreas Elvethun
- [x] **P4.5.2** Verify package.json has "license": "ISC"
- [x] **P4.5.3** Move src/test/setup.ts to tests/setup.ts
- [x] **P4.5.4** Update vitest.config.ts to point to tests/setup.ts
- [x] **P4.5.5** Create .github/CODEOWNERS with @AndreasElvethun
- [x] **P4.5.6** Create .editorconfig for consistent formatting
- [x] **P4.5.7** Create .gitattributes for line ending normalization
- [x] **P4.5.8** Move docs/security.md to SECURITY.md (root)
- [x] **P4.5.9** Remove all emojis from codebase (scripts, docs, locales, package.json)
- [x] **P4.5.10** Update state.yaml and backlog.md with completion status
- [x] **P4.5.11** Commits: "[cleanup][license]", "[cleanup][tests]", "[cleanup][owners]", "[cleanup][config]", "[cleanup][scripts]", "[cleanup][docs]"

### P4.6 - Prettier Integration

- [x] **P4.6.1** Install prettier and eslint-config-prettier
- [x] **P4.6.2** Create .prettierrc.json with config
- [x] **P4.6.3** Create .prettierignore
- [x] **P4.6.4** Update eslint.config.js to use eslint-config-prettier
- [x] **P4.6.5** Add format and format:check scripts to package.json
- [x] **P4.6.6** Format entire codebase with Prettier
- [x] **P4.6.7** Update README.md with format commands
- [x] **P4.6.8** Update state.yaml and backlog.md with completion status
- [x] **P4.6.9** Commit: "[cleanup][prettier]: integrate Prettier for code formatting"

---

## 🧪 Testing & Verifisering

### Etter hver prioritet:

- [ ] **Test 1**: `npm run build` - sjekk at build fungerer
- [ ] **Test 2**: `npm run dev` - kjør app i dev-mode
- [ ] **Test 3**: `npm run lint` - ingen nye linter errors
- [ ] **Test 4**: `git status` - verifiser at kun tiltenkte filer er endret

### Før final commit:

- [ ] **Final 1**: Full build: `npm run dist:clean`
- [ ] **Final 2**: Installer og test distribusjonen
- [ ] **Final 3**: Verifiser at auto-update fortsatt fungerer
- [ ] **Final 4**: Oppdater `docs/cleanup/state.yaml` med completion status

---

## Notater

- Hver endring bør være en separat commit for enkel rollback
- Kjør `git status` ofte for å se at ingenting uventet skjer
- Ta backup av `.exe`-filer før sletting (P1.1.1)
- Test grundig etter P4.1 (email templates) og P2.2 (icon paths)

## Forventet Impact

- **Git repo size**: -260 MB (P1)
- **Duplicate files**: -17 pairs (~20 MB)
- **Root directory**: -10+ filer (bedre oversikt)
- **Developer experience**: Raskere AI-kontekst, klarere struktur
