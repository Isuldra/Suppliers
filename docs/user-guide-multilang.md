# Pulse - User Guide

## 🇳🇴 Norsk (Norwegian)

Denne brukerguiden beskriver hvordan du bruker Pulse for effektiv leverandørstyring og ordreoppfølging.

### 🚀 Kom i gang

#### Første oppstart

1. **Start applikasjonen** - Du vil bli bedt om å velge en Excel-fil for første import
2. **Velg Excel-fil** - Velg filen med ordredata (se [Excel Import](features/excel-import.md) for detaljer)
3. **Vent på import** - Applikasjonen importerer og validerer dataene
4. **Du er klar!** - Applikasjonen er nå klar til bruk

#### Hovedgrensesnitt

Applikasjonen har to hovedvisninger:

- **Hovedside**: For ordrebehandling og e-post sending
- **Dashboard**: For oversikt og statistikk

### 📊 Dashboard

Dashboard gir deg en komplett oversikt over leverandørstatus og ordre.

#### Oversiktkort

Fire hovedkort viser viktig informasjon:

- **Totalt leverandører**: Antall leverandører i systemet
- **Leverandører med åpne ordre**: Antall leverandører som har utestående ordre
- **Totalt åpne ordre**: Antall ordre som venter på levering
- **Totalt restantall**: Sum av alle utestående enheter

#### Grafer og Statistikk

- **Topp 5 leverandører**: Viser leverandører med høyest restantall
- **Ordrer per ukedag**: Fordeling av ordre på ukedager

#### Navigasjon

- Klikk **"Tilbake til hovedside"** for å gå tilbake til ordrebehandling

### 📁 Excel Import og Ordrebehandling

#### Steg 1: Last opp fil

1. **Dra og slipp** Excel-filen i det markerte området, eller klikk for å velge fil
2. **Validering** - Applikasjonen sjekker filformat og innhold
3. **Suksess** - Du ser bekreftelse på at filen er lastet opp

#### Progress Indikator

Etter filopplasting vises en progress indikator som viser hvor du er i prosessen:

- ✅ **Last opp fil** - Fullført
- 🔄 **Velg ukedag** - Aktivt steg
- ⏳ **Velg leverandør** - Kommende
- ⏳ **Gjennomgå data** - Kommende
- ⏳ **Send e-post** - Kommende

#### Steg 2: Velg ukedag

1. **Velg ukedag** fra listen (Mandag-Fredag)
2. **Automatisk oppdatering** - Leverandørlisten oppdateres umiddelbart
3. **Filtrering** - Kun leverandører med åpne ordre vises

#### Steg 3: Velg leverandør

1. **Søk** etter leverandør i søkefeltet (valgfritt)
2. **Velg leverandør** fra listen
3. **Automatisk overgang** - Du går direkte til datagjennomgang

#### Steg 4: Gjennomgå data

1. **Se ordre** for valgt leverandør
2. **Kontroller detaljer** som ordrenummer, antall, beskrivelse
3. **Klikk "Neste"** for å gå til e-post

#### Steg 5: Send e-post

1. **Forhåndsvis** e-posten ved å klikke "Forbered e-post"
2. **Kontroller innhold** i preview-modalen
3. **Send** e-posten via din e-postklient

### ⌨️ Hurtigtaster

Bruk hurtigtaster for raskere navigasjon:

| Tast           | Funksjon                    |
| -------------- | --------------------------- |
| `Ctrl/Cmd + R` | Start applikasjonen på nytt |
| `Ctrl/Cmd + ?` | Vis hurtigtaster hjelp      |
| `Escape`       | Gå tilbake ett steg         |
| `Enter`        | Bekreft valg                |
| `Tab`          | Naviger mellom felter       |

#### Hurtigtaster hjelp

Klikk på ⌨️-ikonet i header for å se alle tilgjengelige hurtigtaster.

### 📧 E-post System

#### E-post Templates

Applikasjonen bruker forhåndsdefinerte maler:

- **Norsk mal**: Standard norsk e-post
- **Engelsk mal**: For internasjonale leverandører

#### Sending av e-post

1. **Automatisk generering** - E-post innhold genereres basert på valgt leverandør og ordre
2. **Preview** - Se e-posten før sending
3. **E-postklient** - E-posten åpnes i din standard e-postklient
4. **Manuell sending** - Du sender e-posten fra din e-postklient

#### E-post Tracking

- **Database oppdatering** - Når e-post sendes, oppdateres databasen
- **Historikk** - Se tidligere sendte e-poster i loggene

### 🔍 Søk og Filtrering

#### Leverandør Søk

- **Realtid søk** - Skriv for å filtrere leverandører
- **Case-insensitive** - Søk fungerer uansett store/små bokstaver
- **Delvis matching** - Søk matcher deler av leverandørnavn

#### Filtrering

- **Ukedag filtrering** - Kun leverandører for valgt ukedag vises
- **Åpne ordre** - Kun leverandører med utestående ordre vises
- **Automatisk oppdatering** - Lister oppdateres når du endrer valg

### 📊 Data og Statistikk

#### Ordre Oversikt

- **Ordrenummer** - Unikt ID for hver ordre
- **Artikkelnummer** - Produkt ID
- **Beskrivelse** - Produktbeskrivelse
- **Bestilt antall** - Opprinnelig bestilt mengde
- **Levert antall** - Hvor mye som er levert
- **Restantall** - Utestående mengde

#### Leverandør Informasjon

- **Navn** - Leverandørnavn
- **E-post** - Kontaktinformasjon
- **Ukedag** - Hvilken dag leverandøren skal purres
- **Status** - Gjeldende status

### 🔧 Innstillinger og Konfigurasjon

#### Database

- **Automatisk backup** - Database sikkerhetskopieres automatisk
- **Lokal lagring** - Alle data lagres lokalt på din maskin
- **Import/Export** - Data kan importeres fra Excel

#### E-post Innstillinger

- **Standard e-postklient** - Bruker din systemets standard e-postklient
- **Template språk** - Automatisk valg basert på leverandør
- **Manuell overskriving** - Du kan endre språk i preview

### 🆘 Feilsøking

#### Vanlige problemer

**Excel-fil kan ikke lastes opp:**

- Sjekk at filen er i `.xlsx` format
- Kontroller at filen inneholder riktige ark (BP, Sjekkliste Leverandører)
- Prøv å lagre filen på nytt i Excel

**Ingen leverandører vises:**

- Sjekk at du har valgt riktig ukedag
- Kontroller at leverandørene har åpne ordre
- Prøv å laste opp Excel-filen på nytt

**E-post kan ikke sendes:**

- Sjekk at du har en standard e-postklient installert
- Kontroller at leverandøren har en gyldig e-postadresse
- Prøv å sende manuelt fra e-postklienten

#### Logg og Debugging

- **Loggvisning** - Tilgjengelig via meny
- **Konsoll** - Teknisk informasjon i utviklermodus
- **Database** - Lokal SQLite-fil for avansert debugging

### 📞 Support

#### Hjelp og Support

- **Innebygd hjelp** - Bruk hurtigtaster hjelp (⌨️)
- **Teknisk support** - Kontakt utviklingsteamet
- **Dokumentasjon** - Se andre dokumentasjonsfiler

#### Kontakt

For teknisk support eller spørsmål:

- Kontakt utviklingsteamet
- Sjekk loggfilene for feilmeldinger
- Dokumenter problemet med skjermbilder

---

**Sist oppdatert**: November 2025  
**Versjon**: 1.3.0

---

## 🇸🇪 Svenska (Swedish)

Denna användarguide beskriver hur du använder Pulse för effektiv leverantörshantering och orderuppföljning.

### 🚀 Kom igång

#### Första start

1. **Starta applikationen** - Du kommer att bli ombedd att välja en Excel-fil för första importen
2. **Välj Excel-fil** - Välj filen med orderdata (se [Excel Import](features/excel-import.md) för detaljer)
3. **Vänta på import** - Applikationen importerar och validerar data
4. **Du är redo!** - Applikationen är nu redo att användas

#### Huvudgränssnitt

Applikationen har två huvudvyer:

- **Huvudsida**: För orderhantering och e-postutskick
- **Dashboard**: För översikt och statistik

### 📊 Dashboard

Dashboard ger dig en komplett översikt över leverantörsstatus och ordrar.

#### Översiktskort

Fyra huvudkort visar viktig information:

- **Totalt antal leverantörer**: Antal leverantörer i systemet
- **Leverantörer med öppna ordrar**: Antal leverantörer som har utestående ordrar
- **Totalt antal öppna ordrar**: Antal ordrar som väntar på leverans
- **Totalt restantal**: Summa av alla utestående enheter

#### Grafer och Statistik

- **Topp 5 leverantörer**: Visar leverantörer med högst restantal
- **Ordrar per veckodag**: Fördelning av ordrar på veckodagar

#### Navigering

- Klicka **"Tillbaka till huvudsida"** för att gå tillbaka till orderhantering

### 📁 Excel Import och Orderhantering

#### Steg 1: Ladda upp fil

1. **Dra och släpp** Excel-filen i det markerade området, eller klicka för att välja fil
2. **Validering** - Applikationen kontrollerar filformat och innehåll
3. **Framgång** - Du ser bekräftelse på att filen har laddats upp

#### Progress Indikator

Efter filuppladdning visas en progressindikator som visar var du är i processen:

- ✅ **Ladda upp fil** - Slutfört
- 🔄 **Välj veckodag** - Aktivt steg
- ⏳ **Välj leverantör** - Kommande
- ⏳ **Granska data** - Kommande
- ⏳ **Skicka e-post** - Kommande

#### Steg 2: Välj veckodag

1. **Välj veckodag** från listan (Måndag-Fredag)
2. **Automatisk uppdatering** - Leverantörslistan uppdateras omedelbart
3. **Filtrering** - Endast leverantörer med öppna ordrar visas

#### Steg 3: Välj leverantör

1. **Sök** efter leverantör i sökfältet (valfritt)
2. **Välj leverantör** från listan
3. **Automatisk övergång** - Du går direkt till datagranskning

#### Steg 4: Granska data

1. **Se ordrar** för vald leverantör
2. **Kontrollera detaljer** som ordernummer, antal, beskrivning
3. **Klicka "Nästa"** för att gå till e-post

#### Steg 5: Skicka e-post

1. **Förhandsvisa** e-posten genom att klicka "Förbered e-post"
2. **Kontrollera innehåll** i förhandsvisningsmodalen
3. **Skicka** e-posten via din e-postklient

### ⌨️ Kortkommandon

Använd kortkommandon för snabbare navigering:

| Tangent        | Funktion                     |
| -------------- | ---------------------------- |
| `Ctrl/Cmd + R` | Starta applikationen på nytt |
| `Ctrl/Cmd + ?` | Visa kortkommandohjälp       |
| `Escape`       | Gå tillbaka ett steg         |
| `Enter`        | Bekräfta val                 |
| `Tab`          | Navigera mellan fält         |

#### Kortkommandohjälp

Klicka på ⌨️-ikonen i header för att se alla tillgängliga kortkommandon.

### 📧 E-post System

#### E-post Mallar

Applikationen använder fördefinierade mallar:

- **Svensk mall**: Standard svensk e-post
- **Engelsk mall**: För internationella leverantörer

#### E-postutskick

1. **Automatisk generering** - E-postinnehåll genereras baserat på vald leverantör och order
2. **Förhandsvisning** - Se e-posten före utskick
3. **E-postklient** - E-posten öppnas i din standard e-postklient
4. **Manuell utskick** - Du skickar e-posten från din e-postklient

#### E-post Spårning

- **Database uppdatering** - När e-post skickas, uppdateras databasen
- **Historik** - Se tidigare skickade e-poster i loggarna

### 🔍 Sök och Filtrering

#### Leverantörssök

- **Realtidssök** - Skriv för att filtrera leverantörer
- **Case-insensitive** - Sök fungerar oavsett stora/små bokstäver
- **Delvis matchning** - Sök matchar delar av leverantörsnamn

#### Filtrering

- **Veckodagsfiltrering** - Endast leverantörer för vald veckodag visas
- **Öppna ordrar** - Endast leverantörer med utestående ordrar visas
- **Automatisk uppdatering** - Listor uppdateras när du ändrar val

### 📊 Data och Statistik

#### Orderöversikt

- **Ordernummer** - Unikt ID för varje order
- **Artikelnummer** - Produkt ID
- **Beskrivning** - Produktbeskrivning
- **Beställt antal** - Ursprungligt beställt antal
- **Levererat antal** - Hur mycket som har levererats
- **Restantal** - Utestående antal

#### Leverantörsinformation

- **Namn** - Leverantörsnamn
- **E-post** - Kontaktinformation
- **Veckodag** - Vilken dag leverantören ska påminnas
- **Status** - Aktuell status

### 🔧 Inställningar och Konfiguration

#### Database

- **Automatisk backup** - Database säkerhetskopieras automatiskt
- **Lokal lagring** - All data lagras lokalt på din maskin
- **Import/Export** - Data kan importeras från Excel

#### E-post Inställningar

- **Standard e-postklient** - Använder din systems standard e-postklient
- **Mallspråk** - Automatisk val baserat på leverantör
- **Manuell överskrivning** - Du kan ändra språk i förhandsvisning

### 🆘 Felsökning

#### Vanliga problem

**Excel-fil kan inte laddas upp:**

- Kontrollera att filen är i `.xlsx` format
- Kontrollera att filen innehåller rätta ark (BP, Sjekkliste Leverandører)
- Försök att spara filen på nytt i Excel

**Inga leverantörer visas:**

- Kontrollera att du har valt rätt veckodag
- Kontrollera att leverantörerna har öppna ordrar
- Försök att ladda upp Excel-filen på nytt

**E-post kan inte skickas:**

- Kontrollera att du har en standard e-postklient installerad
- Kontrollera att leverantören har en giltig e-postadress
- Försök att skicka manuellt från e-postklienten

#### Logg och Debugging

- **Loggvisning** - Tillgänglig via meny
- **Konsol** - Teknisk information i utvecklarläge
- **Database** - Lokal SQLite-fil för avancerad debugging

### 📞 Support

#### Hjälp och Support

- **Inbyggd hjälp** - Använd kortkommandohjälp (⌨️)
- **Teknisk support** - Kontakta utvecklingsteamet
- **Dokumentation** - Se andra dokumentationsfiler

#### Kontakt

För teknisk support eller frågor:

- Kontakta utvecklingsteamet
- Kontrollera loggfilerna för felmeddelanden
- Dokumentera problemet med skärmdumpar

---

**Senast uppdaterad**: November 2025  
**Version**: 1.3.0

---

## 🇩🇰 Dansk (Danish)

Denne brugerguide beskriver, hvordan du bruger Pulse til effektiv leverandørstyring og ordreopgøring.

### 🚀 Kom i gang

#### Første start

1. **Start applikationen** - Du vil blive bedt om at vælge en Excel-fil til første import
2. **Vælg Excel-fil** - Vælg filen med ordredata (se [Excel Import](features/excel-import.md) for detaljer)
3. **Vent på import** - Applikationen importerer og validerer dataene
4. **Du er klar!** - Applikationen er nu klar til brug

#### Hovedinterface

Applikationen har to hovedvisninger:

- **Hovedside**: Til ordrebehandling og e-mail sending
- **Dashboard**: Til oversigt og statistik

### 📊 Dashboard

Dashboard giver dig en komplet oversigt over leverandørstatus og ordrer.

#### Oversigtskort

Fire hovedkort viser vigtig information:

- **Totalt antal leverandører**: Antal leverandører i systemet
- **Leverandører med åbne ordrer**: Antal leverandører, der har udestående ordrer
- **Totalt antal åbne ordrer**: Antal ordrer, der venter på levering
- **Totalt restantal**: Sum af alle udestående enheder

#### Grafer og Statistik

- **Top 5 leverandører**: Viser leverandører med højeste restantal
- **Ordrer per ugedag**: Fordeling af ordrer på ugedage

#### Navigation

- Klik **"Tilbage til hovedside"** for at gå tilbage til ordrebehandling

### 📁 Excel Import og Ordrebehandling

#### Trin 1: Upload fil

1. **Træk og slip** Excel-filen i det markerede område, eller klik for at vælge fil
2. **Validering** - Applikationen tjekker filformat og indhold
3. **Succes** - Du ser bekræftelse på, at filen er uploadet

#### Progress Indikator

Efter filupload vises en progressindikator, der viser, hvor du er i processen:

- ✅ **Upload fil** - Fuldført
- 🔄 **Vælg ugedag** - Aktivt trin
- ⏳ **Vælg leverandør** - Kommende
- ⏳ **Gennemgå data** - Kommende
- ⏳ **Send e-mail** - Kommende

#### Trin 2: Vælg ugedag

1. **Vælg ugedag** fra listen (Mandag-Fredag)
2. **Automatisk opdatering** - Leverandørlisten opdateres øjeblikkeligt
3. **Filtrering** - Kun leverandører med åbne ordrer vises

#### Trin 3: Vælg leverandør

1. **Søg** efter leverandør i søgefeltet (valgfrit)
2. **Vælg leverandør** fra listen
3. **Automatisk overgang** - Du går direkte til datagennemgang

#### Trin 4: Gennemgå data

1. **Se ordrer** for valgt leverandør
2. **Kontroller detaljer** som ordrenummer, antal, beskrivelse
3. **Klik "Næste"** for at gå til e-mail

#### Trin 5: Send e-mail

1. **Forhåndsvis** e-mailen ved at klikke "Forbered e-mail"
2. **Kontroller indhold** i forhåndsvisningsmodalen
3. **Send** e-mailen via din e-mailklient

### ⌨️ Genvejstaster

Brug genvejstaster til hurtigere navigation:

| Tast           | Funktion                   |
| -------------- | -------------------------- |
| `Ctrl/Cmd + R` | Start applikationen forfra |
| `Ctrl/Cmd + ?` | Vis genvejstaster hjælp    |
| `Escape`       | Gå tilbage ét trin         |
| `Enter`        | Bekræft valg               |
| `Tab`          | Naviger mellem felter      |

#### Genvejstaster hjælp

Klik på ⌨️-ikonet i header for at se alle tilgængelige genvejstaster.

### 📧 E-mail System

#### E-mail Skabeloner

Applikationen bruger foruddefinerede skabeloner:

- **Dansk skabelon**: Standard dansk e-mail
- **Engelsk skabelon**: Til internationale leverandører

#### E-mail Udsendelse

1. **Automatisk generering** - E-mail indhold genereres baseret på valgt leverandør og ordre
2. **Forhåndsvisning** - Se e-mailen før udsendelse
3. **E-mailklient** - E-mailen åbnes i din standard e-mailklient
4. **Manuel udsendelse** - Du sender e-mailen fra din e-mailklient

#### E-mail Sporing

- **Database opdatering** - Når e-mail sendes, opdateres databasen
- **Historik** - Se tidligere sendte e-mails i loggene

### 🔍 Søgning og Filtrering

#### Leverandør Søgning

- **Realtidssøgning** - Skriv for at filtrere leverandører
- **Case-insensitive** - Søgning fungerer uanset store/små bogstaver
- **Delvis matchning** - Søgning matcher dele af leverandørnavn

#### Filtrering

- **Ugedagsfiltrering** - Kun leverandører for valgt ugedag vises
- **Åbne ordrer** - Kun leverandører med udestående ordrer vises
- **Automatisk opdatering** - Lister opdateres når du ændrer valg

### 📊 Data og Statistik

#### Ordre Oversigt

- **Ordrenummer** - Unikt ID for hver ordre
- **Artikelnummer** - Produkt ID
- **Beskrivelse** - Produktbeskrivelse
- **Bestilt antal** - Oprindeligt bestilt mængde
- **Leveret antal** - Hvor meget der er leveret
- **Restantal** - Udestående mængde

#### Leverandør Information

- **Navn** - Leverandørnavn
- **E-mail** - Kontaktinformation
- **Ugedag** - Hvilken dag leverandøren skal påmindes
- **Status** - Aktuel status

### 🔧 Indstillinger og Konfiguration

#### Database

- **Automatisk backup** - Database sikkerhedskopieres automatisk
- **Lokal lagring** - Alle data lagres lokalt på din maskine
- **Import/Export** - Data kan importeres fra Excel

#### E-mail Indstillinger

- **Standard e-mailklient** - Bruger din systems standard e-mailklient
- **Skabelon sprog** - Automatisk valg baseret på leverandør
- **Manuel overskrivning** - Du kan ændre sprog i forhåndsvisning

### 🆘 Fejlfinding

#### Almindelige problemer

**Excel-fil kan ikke uploades:**

- Tjek at filen er i `.xlsx` format
- Kontroller at filen indeholder de rigtige ark (BP, Sjekkliste Leverandører)
- Prøv at gemme filen på nytt i Excel

**Ingen leverandører vises:**

- Tjek at du har valgt rigtig ugedag
- Kontroller at leverandørerne har åbne ordrer
- Prøv at uploade Excel-filen på nytt

**E-mail kan ikke sendes:**

- Tjek at du har en standard e-mailklient installeret
- Kontroller at leverandøren har en gyldig e-mailadresse
- Prøv at sende manuelt fra e-mailklienten

#### Log og Debugging

- **Logvisning** - Tilgængelig via menu
- **Konsol** - Teknisk information i udviklertilstand
- **Database** - Lokal SQLite-fil til avanceret debugging

### 📞 Support

#### Hjælp og Support

- **Indbygget hjælp** - Brug genvejstaster hjælp (⌨️)
- **Teknisk support** - Kontakt udviklingsteamet
- **Dokumentation** - Se andre dokumentationsfiler

#### Kontakt

For teknisk support eller spørgsmål:

- Kontakt udviklingsteamet
- Tjek logfilerne for fejlmeddelelser
- Dokumenter problemet med skærmbilleder

---

**Sidst opdateret**: November 2025  
**Version**: 1.3.0

---

## 🇫🇮 Suomi (Finnish)

Tämä käyttöopas kuvaa, kuinka käytät Pulse-sovellusta tehokkaaseen toimittajien hallintaan ja tilausseurantaan.

### 🚀 Aloittaminen

#### Ensimmäinen käynnistys

1. **Käynnistä sovellus** - Sinua pyydetään valitsemaan Excel-tiedosto ensimmäiseen tuontiin
2. **Valitse Excel-tiedosto** - Valitse tiedosto tilausdatalla (katso [Excel Import](features/excel-import.md) yksityiskohdista)
3. **Odota tuontia** - Sovellus tuo ja validoi datan
4. **Olet valmis!** - Sovellus on nyt valmis käyttöön

#### Pääkäyttöliittymä

Sovelluksessa on kaksi pääkatselua:

- **Pääsivu**: Tilauskäsittelyyn ja sähköpostin lähettämiseen
- **Dashboard**: Yleiskatsaukseen ja tilastoihin

### 📊 Dashboard

Dashboard antaa sinulle täydellisen yleiskatsauksen toimittajien tilasta ja tilauksista.

#### Yleiskatsauskortit

Neljä pääkorttia näyttää tärkeää tietoa:

- **Toimittajia yhteensä**: Toimittajien määrä järjestelmässä
- **Toimittajia avoimilla tilauksilla**: Toimittajien määrä, joilla on avoimia tilauksia
- **Avoimia tilauksia yhteensä**: Tilauksien määrä, jotka odottavat toimitusta
- **Jäljellä olevia yhteensä**: Kaikkien avoimien yksiköiden summa

#### Kaaviot ja Tilastot

- **Top 5 toimittajaa**: Näyttää toimittajat, joilla on eniten jäljellä olevia
- **Tilaukset viikonpäivittäin**: Tilauksien jakautuminen viikonpäiville

#### Navigointi

- Klikkaa **"Takaisin pääsivulle"** palataksesi tilauskäsittelyyn

### 📁 Excel Tuonti ja Tilauskäsittely

#### Vaihe 1: Lataa tiedosto

1. **Vedä ja pudota** Excel-tiedosto merkittyyn alueeseen, tai klikkaa valitaksesi tiedosto
2. **Validointi** - Sovellus tarkistaa tiedostomuodon ja sisällön
3. **Onnistuminen** - Näet vahvistuksen tiedoston lataamisesta

#### Edistymisindikaattori

Tiedoston lataamisen jälkeen näkyy edistymisindikaattori, joka näyttää missä vaiheessa olet:

- ✅ **Lataa tiedosto** - Valmis
- 🔄 **Valitse viikonpäivä** - Aktiivinen vaihe
- ⏳ **Valitse toimittaja** - Tulossa
- ⏳ **Tarkista data** - Tulossa
- ⏳ **Lähetä sähköposti** - Tulossa

#### Vaihe 2: Valitse viikonpäivä

1. **Valitse viikonpäivä** listasta (Maanantai-Perjantai)
2. **Automaattinen päivitys** - Toimittajalista päivittyy heti
3. **Suodatus** - Näkyvät vain toimittajat, joilla on avoimia tilauksia

#### Vaihe 3: Valitse toimittaja

1. **Hae** toimittajaa hakukentässä (valinnainen)
2. **Valitse toimittaja** listasta
3. **Automaattinen siirtyminen** - Siirryt suoraan datan tarkistukseen

#### Vaihe 4: Tarkista data

1. **Näe tilaukset** valitulle toimittajalle
2. **Tarkista yksityiskohdat** kuten tilausnumero, määrä, kuvaus
3. **Klikkaa "Seuraava"** siirtyäksesi sähköpostiin

#### Vaihe 5: Lähetä sähköposti

1. **Esikatsele** sähköpostia klikkaamalla "Valmistele sähköposti"
2. **Tarkista sisältö** esikatseluikkunassa
3. **Lähetä** sähköposti sähköpostiohjelmastasi

### ⌨️ Pikanäppäimet

Käytä pikanäppäimiä nopeampaan navigointiin:

| Näppäin        | Toiminto                     |
| -------------- | ---------------------------- |
| `Ctrl/Cmd + R` | Käynnistä sovellus uudelleen |
| `Ctrl/Cmd + ?` | Näytä pikanäppäinohje        |
| `Escape`       | Mene takaisin yksi vaihe     |
| `Enter`        | Vahvista valinta             |
| `Tab`          | Navigoi kenttien välillä     |

#### Pikanäppäinohje

Klikkaa ⌨️-kuvaketta otsikossa nähdäksesi kaikki saatavilla olevat pikanäppäimet.

### 📧 Sähköpostijärjestelmä

#### Sähköpostimallit

Sovellus käyttää ennalta määriteltyjä malleja:

- **Suomalainen malli**: Vakio suomalainen sähköposti
- **Englanninkielinen malli**: Kansainvälisille toimittajille

#### Sähköpostin lähettäminen

1. **Automaattinen generointi** - Sähköpostisisältö generoidaan valitun toimittajan ja tilauksen perusteella
2. **Esikatselu** - Näe sähköposti ennen lähettämistä
3. **Sähköpostiohjelma** - Sähköposti avautuu vakiosähköpostiohjelmassasi
4. **Manuaalinen lähetys** - Lähetät sähköpostin sähköpostiohjelmastasi

#### Sähköpostin seuranta

- **Tietokantapäivitys** - Kun sähköposti lähetetään, tietokanta päivittyy
- **Historia** - Näe aiemmin lähetetyt sähköpostit logeissa

### 🔍 Haku ja Suodatus

#### Toimittajahaku

- **Reaaliaikahaku** - Kirjoita suodattaaksesi toimittajia
- **Kirjainkoko riippumaton** - Haku toimii riippumatta isoista/pienistä kirjaimista
- **Osittainen vastaavuus** - Haku vastaa toimittajan nimen osia

#### Suodatus

- **Viikonpäiväsuodatus** - Näkyvät vain valitun viikonpäivän toimittajat
- **Avoimet tilaukset** - Näkyvät vain toimittajat, joilla on avoimia tilauksia
- **Automaattinen päivitys** - Listat päivittyvät kun muutat valintaa

### 📊 Data ja Tilastot

#### Tilausyleiskatsaus

- **Tilausnumero** - Ainutlaatuinen ID jokaiselle tilaukselle
- **Artikkelinumero** - Tuotteen ID
- **Kuvaus** - Tuotteen kuvaus
- **Tilattu määrä** - Alkuperäinen tilattu määrä
- **Toimitettu määrä** - Kuinka paljon on toimitettu
- **Jäljellä oleva määrä** - Avoin määrä

#### Toimittajatiedot

- **Nimi** - Toimittajan nimi
- **Sähköposti** - Yhteystiedot
- **Viikonpäivä** - Milloin toimittajaa muistutetaan
- **Tila** - Nykyinen tila

### 🔧 Asetukset ja Konfiguraatio

#### Tietokanta

- **Automaattinen varmuuskopio** - Tietokanta varmuuskopioidaan automaattisesti
- **Paikallinen tallennus** - Kaikki data tallennetaan paikallisesti koneellesi
- **Tuo/Vie** - Data voidaan tuoda Excelistä

#### Sähköpostiasetukset

- **Vakiosähköpostiohjelma** - Käyttää järjestelmäsi vakiosähköpostiohjelmaa
- **Mallin kieli** - Automaattinen valinta toimittajan perusteella
- **Manuaalinen ylikirjoitus** - Voit muuttaa kieltä esikatselussa

### 🆘 Vianmääritys

#### Yleiset ongelmat

**Excel-tiedostoa ei voi ladata:**

- Tarkista että tiedosto on `.xlsx` muodossa
- Varmista että tiedosto sisältää oikeat arkistot (BP, Sjekkliste Leverandører)
- Yritä tallentaa tiedosto uudelleen Excelissä

**Toimittajia ei näy:**

- Tarkista että olet valinnut oikean viikonpäivän
- Varmista että toimittajilla on avoimia tilauksia
- Yritä ladata Excel-tiedosto uudelleen

**Sähköpostia ei voi lähettää:**

- Tarkista että sinulla on vakiosähköpostiohjelma asennettuna
- Varmista että toimittajalla on kelvollinen sähköpostiosoite
- Yritä lähettää manuaalisesti sähköpostiohjelmasta

#### Lokit ja Debuggaus

- **Lokinäyttö** - Saatavilla valikosta
- **Konsoli** - Teknistä tietoa kehittäjätilassa
- **Tietokanta** - Paikallinen SQLite-tiedosto edistyneeseen debuggaukseen

### 📞 Tuki

#### Apu ja Tuki

- **Sisäänrakennettu apu** - Käytä pikanäppäinohjetta (⌨️)
- **Tekninen tuki** - Ota yhteyttä kehitystiimiin
- **Dokumentaatio** - Katso muita dokumentaatiotiedostoja

#### Yhteystiedot

Teknisestä tuesta tai kysymyksistä:

- Ota yhteyttä kehitystiimiin
- Tarkista lokitiedostot virheilmoituksia varten
- Dokumentoi ongelma kuvakaappauksilla

---

**Viimeksi päivitetty**: Marraskuu 2025  
**Versio**: 1.3.0

---

## 🇬🇧 English

This user guide describes how to use Pulse for effective supplier management and order tracking.

### 🚀 Getting Started

#### First Launch

1. **Start the application** - You will be prompted to select an Excel file for the first import
2. **Choose Excel file** - Select the file with order data (see [Excel Import](features/excel-import.md) for details)
3. **Wait for import** - The application imports and validates the data
4. **You're ready!** - The application is now ready to use

#### Main Interface

The application has two main views:

- **Home page**: For order processing and email sending
- **Dashboard**: For overview and statistics

### 📊 Dashboard

Dashboard gives you a complete overview of supplier status and orders.

#### Overview Cards

Four main cards show important information:

- **Total suppliers**: Number of suppliers in the system
- **Suppliers with open orders**: Number of suppliers with outstanding orders
- **Total open orders**: Number of orders waiting for delivery
- **Total outstanding quantity**: Sum of all outstanding units

#### Charts and Statistics

- **Top 5 suppliers**: Shows suppliers with highest outstanding quantities
- **Orders per weekday**: Distribution of orders across weekdays

#### Navigation

- Click **"Back to home page"** to return to order processing

### 📁 Excel Import and Order Processing

#### Step 1: Upload file

1. **Drag and drop** the Excel file in the marked area, or click to select file
2. **Validation** - The application checks file format and content
3. **Success** - You see confirmation that the file has been uploaded

#### Progress Indicator

After file upload, a progress indicator shows where you are in the process:

- ✅ **Upload file** - Completed
- 🔄 **Select weekday** - Active step
- ⏳ **Select supplier** - Upcoming
- ⏳ **Review data** - Upcoming
- ⏳ **Send email** - Upcoming

#### Step 2: Select weekday

1. **Choose weekday** from the list (Monday-Friday)
2. **Automatic update** - The supplier list updates immediately
3. **Filtering** - Only suppliers with open orders are shown

#### Step 3: Select supplier

1. **Search** for supplier in the search field (optional)
2. **Select supplier** from the list
3. **Automatic transition** - You go directly to data review

#### Step 4: Review data

1. **See orders** for the selected supplier
2. **Check details** such as order number, quantity, description
3. **Click "Next"** to go to email

#### Step 5: Send email

1. **Preview** the email by clicking "Prepare email"
2. **Check content** in the preview modal
3. **Send** the email via your email client

### ⌨️ Keyboard Shortcuts

Use keyboard shortcuts for faster navigation:

| Key            | Function                     |
| -------------- | ---------------------------- |
| `Ctrl/Cmd + R` | Restart the application      |
| `Ctrl/Cmd + ?` | Show keyboard shortcuts help |
| `Escape`       | Go back one step             |
| `Enter`        | Confirm selection            |
| `Tab`          | Navigate between fields      |

#### Keyboard shortcuts help

Click the ⌨️ icon in the header to see all available keyboard shortcuts.

### 📧 Email System

#### Email Templates

The application uses predefined templates:

- **Norwegian template**: Standard Norwegian email
- **English template**: For international suppliers

#### Email Sending

1. **Automatic generation** - Email content is generated based on selected supplier and order
2. **Preview** - See the email before sending
3. **Email client** - The email opens in your default email client
4. **Manual sending** - You send the email from your email client

#### Email Tracking

- **Database update** - When email is sent, the database is updated
- **History** - See previously sent emails in the logs

### 🔍 Search and Filtering

#### Supplier Search

- **Real-time search** - Type to filter suppliers
- **Case-insensitive** - Search works regardless of upper/lower case
- **Partial matching** - Search matches parts of supplier names

#### Filtering

- **Weekday filtering** - Only suppliers for the selected weekday are shown
- **Open orders** - Only suppliers with outstanding orders are shown
- **Automatic update** - Lists update when you change selections

### 📊 Data and Statistics

#### Order Overview

- **Order number** - Unique ID for each order
- **Item number** - Product ID
- **Description** - Product description
- **Ordered quantity** - Originally ordered quantity
- **Delivered quantity** - How much has been delivered
- **Outstanding quantity** - Outstanding amount

#### Supplier Information

- **Name** - Supplier name
- **Email** - Contact information
- **Weekday** - Which day the supplier should be reminded
- **Status** - Current status

### 🔧 Settings and Configuration

#### Database

- **Automatic backup** - Database is automatically backed up
- **Local storage** - All data is stored locally on your machine
- **Import/Export** - Data can be imported from Excel

#### Email Settings

- **Default email client** - Uses your system's default email client
- **Template language** - Automatic selection based on supplier
- **Manual override** - You can change language in preview

### 🆘 Troubleshooting

#### Common Problems

**Excel file cannot be uploaded:**

- Check that the file is in `.xlsx` format
- Verify that the file contains the correct sheets (BP, Sjekkliste Leverandører)
- Try saving the file again in Excel

**No suppliers are shown:**

- Check that you have selected the correct weekday
- Verify that suppliers have open orders
- Try uploading the Excel file again

**Email cannot be sent:**

- Check that you have a default email client installed
- Verify that the supplier has a valid email address
- Try sending manually from the email client

#### Logs and Debugging

- **Log viewing** - Available via menu
- **Console** - Technical information in developer mode
- **Database** - Local SQLite file for advanced debugging

### 📞 Support

#### Help and Support

- **Built-in help** - Use keyboard shortcuts help (⌨️)
- **Technical support** - Contact the development team
- **Documentation** - See other documentation files

#### Contact

For technical support or questions:

- Contact the development team
- Check log files for error messages
- Document the problem with screenshots

---

**Last updated**: November 2025  
**Version**: 1.3.0
