# Endre e-postinnhold

Purringene bygges i `src/renderer/workspace/reminder.ts`. Der ligger språktekst, emne, tabellkolonner og HTML for norsk, engelsk, svensk, dansk og finsk. Det finnes ingen separat malgenerator.

Behold escaping av verdier fra Excel og den delte mottakervalideringen i `src/utils/emailRecipients.ts`. Kontroller lange navn, tomme datoer, kommentarer og tegn som `&` og `<`.

Åpne gjennomgangen uten å sende, og kontroller hver berørt språkvariant. Ved layoutendringer må HTML også kontrolleres i Outlook, som har en annen HTML-motor enn appens forhåndsvisning.

Se [utviklingsoppsett](../development/setup.md) for tester og typekontroll. Automatiske tester bruker mock av Outlook-transporten.
