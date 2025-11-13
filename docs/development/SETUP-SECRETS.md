# Setting Up Secrets

Denne guiden viser hvordan du setter opp secrets (GitHub token, etc) på en sikker måte.

## GitHub Personal Access Token

GitHub token trengs for å automatisk opprette releases og uploade filer.

### 1. Opprett Token

1. Gå til: https://github.com/settings/tokens
2. Klikk "Generate new token" → "Generate new token (classic)"
3. Gi tokenet et navn: `Pulse Release Token`
4. Velg scopes:
   - `repo` (Full control of private repositories) - VIKTIG!
5. Sett expiration til "No expiration" eller velg en passende periode
6. Klikk "Generate token"
7. **KOPIER TOKENET NÅ** - du kan ikke se det igjen!

### 2. Lagre Token Lokalt (macOS/Linux)

Legg til i din shell-konfigurasjon:

**For zsh (default på macOS):**

```bash
echo 'export GITHUB_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

**For bash:**

```bash
echo 'export GITHUB_TOKEN="your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Verifiser Token

```bash
echo $GITHUB_TOKEN
# Skal vise tokenet (starter med ghp_ eller github_pat_)

# Test token med scriptet
npm run validate:release
```

### 4. Bruk av Token

Token brukes automatisk av:

- `npm run release:github` - Oppretter GitHub Release
- `scripts/create-github-release.js` - Script for release
- `scripts/validate-release.js` - Validering av release

## Sikkerhet

### DO NOT:

- ❌ Hardkode token i kode
- ❌ Commit token til git
- ❌ Del token med andre
- ❌ Lagre token i usikre filer

### DO:

- ✅ Bruk miljøvariabler (export GITHUB_TOKEN)
- ✅ Legg til .env i .gitignore (allerede gjort)
- ✅ Roter token hvis det blir eksponert
- ✅ Sett expiration på token

## Hvis Token Blir Eksponert

1. **Slett tokenet umiddelbart:**
   - Gå til: https://github.com/settings/tokens
   - Finn tokenet og klikk "Delete"

2. **Opprett nytt token:**
   - Følg steg 1-2 ovenfor med nytt token

3. **Sjekk git history:**

   ```bash
   # Søk etter token i git history
   git log --all -p | grep -i "github_pat"

   # Hvis funnet, må du rense git history (kontakt admin)
   ```

4. **Oppdater miljøvariabel:**
   ```bash
   # Oppdater ~/.zshrc eller ~/.bashrc med nytt token
   export GITHUB_TOKEN="new_token_here"
   source ~/.zshrc
   ```

## GitHub Actions (CI/CD)

For GitHub Actions, legg til token som repository secret:

1. Gå til repository på GitHub
2. Settings → Secrets and variables → Actions
3. New repository secret
4. Name: `GITHUB_TOKEN` (eller bruk GITHUB_TOKEN som er built-in)
5. Value: ditt token

**VIKTIG:** GitHub Actions har allerede et built-in `GITHUB_TOKEN` som fungerer for de fleste operasjoner.

## Slack Webhook (Optional)

For changelog notifications til Slack:

1. Opprett Incoming Webhook i Slack workspace
2. Legg til i miljøvariabel:
   ```bash
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

## Relatert Dokumentasjon

- [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) - Release prosess
- [GITHUB-RELEASES.md](./GITHUB-RELEASES.md) - GitHub Releases setup
