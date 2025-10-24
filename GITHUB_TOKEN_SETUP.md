# GitHub Token Setup for Auto-Release

## Hvorfor trenger vi en GitHub Token?

For å automatisere GitHub Release-opprettelsen trenger vi en Personal Access Token som gir scriptet tilgang til å:
- Opprette releases
- Laste opp filer (assets)
- Håndtere repository-metadata

## Slik setter du opp GitHub Token:

### 1. Gå til GitHub Settings
- Gå til: https://github.com/settings/tokens
- Eller: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

### 2. Opprett ny token
- Klikk "Generate new token (classic)"
- Gi den et beskrivende navn: `OneMed SupplyChain Auto-Release`
- Velg utløpsdato (anbefalt: 1 år)

### 3. Velg riktige permissions
Sjekk av disse boksene:
- ✅ **repo** (Full control of private repositories)
  - ✅ repo:status
  - ✅ repo_deployment  
  - ✅ public_repo
  - ✅ repo:invite
  - ✅ security_events

### 4. Generer og kopier token
- Klikk "Generate token"
- **VIKTIG:** Kopier tokenet med en gang (du ser det bare én gang!)
- Det ser ut som: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 5. Sett token som miljøvariabel

**På Mac/Linux:**
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**For å gjøre det permanent:**
```bash
echo 'export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' >> ~/.zshrc
source ~/.zshrc
```

**På Windows (PowerShell):**
```powershell
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 6. Test at det fungerer
```bash
npm run release:github
```

## Sikkerhet

- **Ikke commit token til Git!** 
- Token er allerede ekskludert i `.gitignore`
- Hvis token lekker, gå tilbake til GitHub og "Revoke" den gamle
- Opprett en ny token med samme permissions

## Automatisk workflow

Etter at token er satt opp, kan du kjøre:

```bash
# Fullstendig release (anbefalt)
npm run release:full

# Eller steg for steg:
npm run release:prepare  # Generer latest.yml
npm run release:github   # Opprett GitHub Release
```

## Feilsøking

**"Authentication failed"**
- Sjekk at `GITHUB_TOKEN` er satt: `echo $GITHUB_TOKEN`
- Verifiser at token ikke har utløpt

**"Permission denied"**  
- Sjekk at token har "repo" permission
- Verifiser at du har write-tilgang til repository

**"Release already exists"**
- Scriptet håndterer dette automatisk
- Det vil ikke opprette duplikater
