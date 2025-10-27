# 🚀 Automated Release Workflow

Dette prosjektet har nå en fullstendig automatiserte release-workflow som løser problemet med dupliserte oppdateringsmeldinger og 404-feil.

## 🔧 Problem løst

**Før:** Metadata-filer (`docs/updates/latest.yml`, `docs/updates/latest.json`, etc.) ble ikke automatisk pushet til GitHub, noe som førte til at Cloudflare Pages serverte utdaterte filer og auto-updateren feilet med 404-feil.

**Nå:** GitHub Actions automatiserer hele prosessen og sikrer at metadata-filene alltid er oppdaterte.

## 📋 Hvordan bruke den nye workflowen

### Valg 1: Automatisk release via GitHub Actions (Anbefalt)

1. **Gå til GitHub Actions:**

   - Åpne GitHub-repositoryet ditt
   - Klikk på "Actions" fanen
   - Velg "Manual Release" workflow

2. **Start en release:**

   - Klikk "Run workflow"
   - Skriv inn versjonsnummeret (f.eks. `1.3.5`)
   - Klikk "Run workflow"

3. **GitHub Actions gjør resten:**
   - ✅ Bygger applikasjonen
   - ✅ Genererer metadata-filer
   - ✅ Oppretter GitHub Release
   - ✅ Committer og pusher metadata-filer automatisk
   - ✅ Cloudflare Pages oppdateres automatisk

### Valg 2: Lokal release (hvis du trenger manuell kontroll)

```bash
# Kjør hele release-prosessen lokalt
npm run release:local

# Husk å committe og pushe metadata-filene manuelt:
git add docs/updates/
git commit -m "chore(release): Update Cloudflare metadata for v1.3.5"
git push origin main
```

## 🔄 Workflow-detaljer

### Automatisk workflow (triggered by git tags)

- **Trigger:** Når du pusher en git tag (f.eks. `v1.3.5`)
- **Prosess:** Samme som manuell workflow, men automatisk

### Manuell workflow

- **Trigger:** Via GitHub Actions UI
- **Input:** Versjonsnummer
- **Prosess:** Fullstendig automatiserte release

## 📁 Filer som blir automatisk håndtert

- `docs/updates/latest.yml` - Auto-update metadata
- `docs/updates/latest.json` - Portable version metadata
- `docs/updates/index.html` - Status side
- `docs/updates/_redirects` - Cloudflare Pages redirects

## 🎯 Resultat

- ✅ Ingen dupliserte oppdateringsmeldinger
- ✅ Ingen 404-feil i auto-updateren
- ✅ Cloudflare Pages viser kun nåværende versjon
- ✅ Fullstendig automatiserte releases
- ✅ Metadata-filer er alltid synkroniserte

## 🚨 Viktige notater

1. **GitHub Token:** Sørg for at `GITHUB_TOKEN` er konfigurert i repository settings
2. **Cloudflare Pages:** Oppdateres automatisk når metadata-filer pushes
3. **Auto-updater:** Bruker nå `https://suppliers-anx.pages.dev/latest.yml` som kilde
4. **Backup:** Du kan fortsatt bruke `npm run release:local` for manuell kontroll

## 🔍 Troubleshooting

Hvis du fortsatt får 404-feil:

1. Sjekk at GitHub Actions workflow kjørte uten feil
2. Verifiser at `docs/updates/latest.yml` er pushet til GitHub
3. Sjekk Cloudflare Pages deployment status
4. Test auto-update URL: https://suppliers-anx.pages.dev/latest.yml

---

**🎉 Nå skal auto-update systemet fungere perfekt uten dupliserte meldinger!**
