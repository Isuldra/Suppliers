# Dokumentasjon for Pulse

Pulse importerer innkjøpslinjer fra Excel og lager leverandørpurringer som sendes gjennom Outlook på Windows. Dokumentasjonen beskriver arbeidsflaten i dagens kode.

## Bruke appen

- [Kom i gang](getting-started.md): installasjon og første import.
- [Brukerveiledning](user-guide.md): velge linjer, kontrollere og sende purringer.
- [Kort veiledning på fem språk](user-guide-multilang.md).
- [Leverandørregister](features/supplier-register.md), [Excel-import](features/excel-import.md) og [dashboard](features/dashboard.md).
- [Outlook-oppsett](features/email-setup.md), [sendeflyt](features/email-reminders.md) og [e-postspråk](features/language-detection.md).
- [Windows-feilsøking](distribution/WINDOWS-TROUBLESHOOTING.md).

## Utvikle og distribuere

- [Utviklingsmiljø](development/setup.md) og [arkitektur](architecture.md).
- [Lagring og sikkerhetskopier](features/database.md).
- [Endre e-postmaler](features/email-templates.md).
- [CI](development/ci-cd-pipeline.md), [versjonering](development/VERSIONING.md) og [publisering](development/publishing-updates.md).
- [GitHub-tilgang](development/github-token-setup.md), [signering](development/CODE-SIGNING.md) og [native moduler](development/troubleshoot-native-modules.md).
- [Distribusjon](distribution/DISTRIBUTION.md), [portable-utgave](distribution/PORTABLE.md) og [Cloudflare Pages](setup/cloudflare-pages-setup.md).

[Endringshistorikken](CHANGELOG.md) oppsummerer tidligere arbeid. [Åpne forbedringer](planning/planned-features.md) skiller faktiske mangler fra ideer.

`docs/updates/` inneholder nettsiden og metadata som oppdateringsklientene bruker. Filene der er publiseringsartefakter og må stemme med de tilgjengelige GitHub-filene.
