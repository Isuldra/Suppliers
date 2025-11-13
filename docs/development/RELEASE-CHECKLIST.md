# Release Checklist - Pulse

Denne guiden sikrer at alle releases fungerer korrekt og unngår 404-feil ved auto-update.

## VIKTIG: Forhindre 404-feil

**Problem:** Hvis `latest.yml` oppdateres FØR GitHub Release er publisert, vil brukere få 404-feil når de prøver å laste ned oppdateringer.

**Løsning:** Følg denne rekkefølgen nøye!

## Release Prosess

### 1. Forberedelse

```bash
# Sjekk at du er på riktig branch
git checkout develop  # eller release/vX.Y.Z

# Sjekk at alt er commitet
git status

# Bump versjonsnummer (hvis nødvendig)
npm run version:bump       # patch: 1.0.0 → 1.0.1
# eller
npm run version:bump:minor # minor: 1.0.0 → 1.1.0
# eller
npm run version:bump:major # major: 1.0.0 → 2.0.0
```

### 2. Bygg Applikasjonen

```bash
# Bygg alle distributable filer
npm run dist:clean

# Eller bygg spesifikke versjoner
npm run dist:nsis     # NSIS installer
npm run dist:portable # Portable executable
```

**Verifiser at filene er bygget:**

- `release/Pulse-X.Y.Z-setup.exe` (NSIS installer)
- `release/Pulse-Portable.exe` (Portable)
- `release/Pulse-X.Y.Z-setup.exe.blockmap` (Blockmap)

### 3. Generer Metadata

```bash
# Generer latest.yml og latest.json
npm run release:prepare
```

**Dette scriptet:**

- Validerer versjonsnummer format
- Beregner SHA512 hashes
- Genererer `docs/updates/latest.yml`
- Genererer `docs/updates/latest.json`
- Kopierer `latest.yml` til `release/` directory
- Viser viktig påminnelse om rekkefølge

**OBS:** Ikke commit `docs/updates/` ennå!

### 4. Opprett GitHub Release

**Dette er det kritiske steget - MÅ gjøres FØR metadata deployes!**

```bash
# Opprett GitHub Release og upload filer
npm run release:github
```

**Eller manuelt:**

1. Gå til: https://github.com/Isuldra/Suppliers/releases/new
2. Tag version: `vX.Y.Z` (f.eks. `v1.4.1`)
3. Release title: `Release vX.Y.Z`
4. Beskrivelse: Kopier fra `docs/CHANGELOG.md`
5. Upload filer fra `release/` directory:
   - `Pulse-X.Y.Z-setup.exe`
   - `Pulse-X.Y.Z-setup.exe.blockmap`
   - `Pulse-Portable.exe`
   - `latest.yml` (valgfri - for referanse)
6. **Publiser releasen** (VIKTIG!)

### 5. Valider Release

```bash
# Verifiser at GitHub Release eksisterer og har alle filer
npm run validate:release
```

**Dette scriptet sjekker:**

- GitHub Release `vX.Y.Z` eksisterer
- `Pulse-X.Y.Z-setup.exe` er uploadet
- `Pulse-Portable.exe` er uploadet
- `latest.yml` peker til riktig versjon
- Ingen PLACEHOLDER verdier i `latest.yml`

**Hvis valideringen feiler:**

- Sjekk at GitHub Release er publisert (ikke draft)
- Verifiser at alle filer er uploadet korrekt
- Sjekk at filnavnene matcher eksakt

### 6. Deploy Metadata til Cloudflare Pages

**Nå er det trygt å committe og pushe metadata-filene:**

```bash
# Commit metadata files
git add docs/updates/latest.yml docs/updates/latest.json docs/updates/index.html
git commit -m "chore(release): update metadata for v1.4.1"
git push origin develop  # eller release/vX.Y.Z
```

**Cloudflare Pages vil automatisk:**

- Detektere endringer i `docs/updates/`
- Deploye til `https://suppliers-anx.pages.dev/`
- Gjøre `latest.yml` tilgjengelig for auto-update

### 7. Test Auto-Update

**Test fra eksisterende versjon:**

1. Åpne en eldre versjon av Pulse
2. Gå til Settings → Check for Updates
3. Verifiser at oppdateringen blir funnet
4. Verifiser at nedlasting starter automatisk
5. Verifiser at installasjon fungerer

**Test portable versjon:**

1. Last ned `Pulse-Portable.exe` fra GitHub Release
2. Kjør den og sjekk for oppdateringer
3. Verifiser at portable-oppdatering fungerer

### 8. Merge til Main (Gitflow)

```bash
# Fra release branch
git checkout main
git merge release/vX.Y.Z --no-ff
git tag vX.Y.Z
git push origin main --tags

# Merge tilbake til develop
git checkout develop
git merge main
git push origin develop

# Slett release branch
git branch -d release/vX.Y.Z
git push origin --delete release/vX.Y.Z
```

## Troubleshooting

### Problem: 404 Error ved auto-update

**Symptomer:**

```
[info] Checking for update
[error] Update check failed: HttpError: 404 Not Found
```

**Årsak:** `latest.yml` peker til en GitHub Release som ikke eksisterer eller mangler filer.

**Løsning:**

1. Sjekk at GitHub Release eksisterer:

   ```bash
   npm run validate:release
   ```

2. Verifiser URL manuelt:

   ```
   https://github.com/Isuldra/Suppliers/releases/download/vX.Y.Z/Pulse-X.Y.Z-setup.exe
   ```

3. Hvis release mangler:
   - Opprett release manuelt på GitHub
   - Upload alle nødvendige filer
   - Kjør `npm run validate:release` igjen

4. Hvis filer mangler:
   - Upload manglende filer til eksisterende release
   - Verifiser filnavnene matcher eksakt

### Problem: Versjonsmismatch

**Symptomer:**

```
latest.yml peker til v1.3.8
package.json viser v1.4.1
```

**Løsning:**

```bash
# Regenerer metadata med korrekt versjon
npm run release:prepare

# Verifiser versjon
npm run validate:release

# Commit og push til Cloudflare
git add docs/updates/
git commit -m "fix(release): update latest.yml to v1.4.1"
git push
```

### Problem: PLACEHOLDER verdier i latest.yml

**Symptomer:**

```yaml
sha512: PLACEHOLDER_HASH_WILL_BE_UPDATED_BY_RELEASE_SCRIPT
```

**Løsning:**

```bash
# Bygg applikasjonen på nytt
npm run dist:clean

# Regenerer metadata (vil beregne ekte hashes)
npm run release:prepare
```

## Quick Reference

### Vanlige Kommandoer

```bash
# Full release prosess
npm run release:full

# Steg-for-steg
npm run dist:clean              # 1. Bygg
npm run release:prepare         # 2. Generer metadata
npm run release:github          # 3. Opprett GitHub Release
npm run validate:release        # 4. Valider release
# ... deretter commit og push

# Validering
npm run validate:version        # Sjekk versjon format
npm run validate:release        # Sjekk GitHub Release
npm run quality                 # Sjekk kodekvalitet

# Testing
npm run test                    # Kjør tester
npm run typecheck               # TypeScript sjekk
npm run lint                    # ESLint sjekk
```

### Rekkefølge (VIKTIG!)

1. Bygg (`npm run dist:clean`)
2. Generer metadata (`npm run release:prepare`)
3. Opprett GitHub Release (`npm run release:github`)
4. Valider (`npm run validate:release`)
5. Commit & push metadata files
6. Vent på Cloudflare Pages deploy
7. Test auto-update

## Automatiske Sikkerhetskontroller

Følgende valideringer kjøres automatisk:

### I `prepare-cloudflare-release.js`:

- Versjonsnummer format (X.Y.Z)
- Installer-filer eksisterer
- SHA512 hashes beregnes korrekt
- Ingen PLACEHOLDER verdier i output
- Varsler hvis `latest.yml` allerede peker til samme versjon

### I `validate-release.js`:

- GitHub Release eksisterer
- Alle nødvendige assets er uploadet
- Filstørrelser er fornuftige
- URLs er tilgjengelige
- Metadata filer matcher versjon

### I CI/CD (GitHub Actions):

- Prettier formatting
- ESLint rules
- TypeScript type checking
- Unit tests (Vitest)

## Relatert Dokumentasjon

- [Auto-Update Workflow](./auto-update-workflow.md)
- [GitHub Releases Setup](./GITHUB-RELEASES.md)
- [Versioning Strategy](./VERSIONING.md)
- [CI/CD Pipeline](./ci-cd-pipeline.md)

---

**Laget for å forhindre 404-feil og sikre smooth releases!**
