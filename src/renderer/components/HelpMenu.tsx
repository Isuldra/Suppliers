const handleHelpOptionClick = async (option: HelpOption) => {
  try {
    setActiveOption(option);

    if (option === "documentation") {
      console.log("Opening documentation link...");
      const result = await window.electron.openExternalLink(
        "https://github.com/Isuldra/Suppliers/wiki"
      );
      console.log("Open documentation result:", result);

      if (!result.success) {
        console.error("Failed to open documentation:", result.error);
        toast.error(
          <div>
            <p>Kunne ikke åpne dokumentasjonen.</p>
            <p className="text-xs mt-1">
              {result.error ||
                "Prøv å åpne lenken manuelt: https://github.com/Isuldra/Suppliers/wiki"}
            </p>
          </div>
        );
      }
    } else if (option === "support") {
      console.log("Opening email client...");
      // Bruk encoding for å sikre kompatibilitet med forskjellige e-post-klienter
      const subject = encodeURIComponent("Supplier Reminder Pro Support");
      const body = encodeURIComponent(
        "Vennligst beskriv problemet ditt her..."
      );
      const email = "andreas.elvethun@onemed.com";

      const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
      console.log("Mailto URL:", mailtoUrl);

      const result = await window.electron.openExternalLink(mailtoUrl);
      console.log("Open email result:", result);

      if (!result.success) {
        console.error("Failed to open email client:", result.error);
        toast.error(
          <div>
            <p>Kunne ikke åpne e-post-klienten.</p>
            <p className="text-xs mt-1">
              Send e-post til andreas.elvethun@onemed.com med emnet "Supplier
              Reminder Pro Support"
            </p>
          </div>
        );

        // Kopier e-postadressen til utklippstavlen som fallback
        navigator.clipboard
          .writeText("andreas.elvethun@onemed.com")
          .then(() => toast.info("E-postadresse kopiert til utklippstavlen"))
          .catch((err) =>
            console.error("Kunne ikke kopiere til utklippstavlen:", err)
          );
      }
    }

    // Lukk menyen etter handling
    setIsMenuOpen(false);
  } catch (error) {
    console.error("Error in handleHelpOptionClick:", error);
    toast.error("Det oppstod en feil. Prøv igjen senere.");
  }
};
