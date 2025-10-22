# Email Templates (Current Implementation)

This document describes the current, simplified email templating system used in SupplyChain OneMed for sending supplier reminder emails.

**Note:** This implementation differs significantly from potentially planned future enhancements. For desired future features like a database-backed template editor, custom helpers, categories, etc., please refer to `docs/planning/planned-features.md`.

## Overview

The application uses a basic templating approach to generate reminder emails for suppliers regarding outstanding orders. It utilizes hardcoded HTML templates with Handlebars syntax for inserting dynamic data.

## Implementation Details

The core logic resides in `src/renderer/services/emailService.ts`.

### Templates

- **Two Hardcoded Templates:** The service contains two hardcoded HTML templates: one for Norwegian (`no`) and one for English (`en`).
- **Selection:** The language ('no' or 'en') passed in the data determines which template is used. Defaults to Norwegian if unspecified.
- **Handlebars:** The templates use [Handlebars.js](https://handlebarsjs.com/) syntax for variable substitution (`{{variableName}}`), iterating over orders (`{{#each orders}}...{{/each}}`), and basic conditional logic (`{{#if (gt outstandingQty 0)}}...{{/if}}`).

### Template Content (Simplified Structure)

**Norwegian Template (`noTemplate` variable):**

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      ...;
    </style>
  </head>
  <body>
    <h2>Purring på manglende leveranser</h2>
    <p>Hei {{supplier}},</p>
    <p>Dette er en påminnelse om følgende manglende leveranser:</p>
    <table>
      <thead>
        ...
        <th>Lev. ArtNr</th>
        <th>Spesifikasjon</th>
        <th>Utestående antall</th>
        ...
      </thead>
      <tbody>
        {{#each orders}}
        <tr class="{{#if (gt outstandingQty 0)}}urgent{{/if}}">
          <td>{{poNumber}}</td>
          <td>{{itemNo}}</td>
          <td>{{description}}</td>
          <td>{{specification}}</td>
          <td>{{orderQty}}</td>
          <td>{{receivedQty}}</td>
          <td>{{outstandingQty}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    <p>
      Vennligst bekreft mottak av denne meldingen og oppdater leveringsstatus.
    </p>
    <p>Med vennlig hilsen,<br />OneMed Norge AS</p>
  </body>
</html>
```

**English Template (`enTemplate` variable):**

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      ...;
    </style>
  </head>
  <body>
    <h2>Reminder for Outstanding Orders</h2>
    <p>Hello {{supplier}},</p>
    <p>This is a reminder regarding the following outstanding orders:</p>
    <table>
      <thead>
        ...
        <th>Supplier ArtNo</th>
        <th>Specification</th>
        <th>Outstanding Qty</th>
        ...
      </thead>
      <tbody>
        {{#each orders}}
        <tr class="{{#if (gt outstandingQty 0)}}urgent{{/if}}">
          <td>{{poNumber}}</td>
          <td>{{itemNo}}</td>
          <td>{{description}}</td>
          <td>{{specification}}</td>
          <td>{{orderQty}}</td>
          <td>{{receivedQty}}</td>
          <td>{{outstandingQty}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    <p>
      Please confirm receipt of this message and provide updated delivery
      status.
    </p>
    <p>Kind regards,<br />OneMed Norge AS</p>
  </body>
</html>
```

_(Note: Styles and full table headers are omitted for brevity)_

### Helpers

- **`gt` Helper:** A single custom Handlebars helper `gt` is registered (`Handlebars.registerHelper("gt", (a, b) => a > b)`). This is used in the template for conditional styling (e.g., marking rows as urgent if `outstandingQty` is greater than 0).
- **No Other Custom Helpers:** The previously documented `formatDate`, `formatCurrency`, and `pluralize` helpers are **not** currently implemented or registered.

### Data

The `EmailData` interface expected by the service includes:

- `supplier`: The supplier name (string).
- `orders`: An array of order objects, each containing fields like `poNumber`, `itemNo`, `description`, `orderQty`, `receivedQty`, `outstandingQty`.
- `language`: Optional 'no' or 'en' to select the template.

### Email Generation and Sending

1.  **Recipient Lookup:** The `getSupplierEmail` method in the service looks up the supplier's email address in `src/renderer/data/supplierEmails.json` based on the provided supplier name. It performs direct and case-insensitive matching.
2.  **Subject Generation:** The email subject is generated dynamically based on the selected language (e.g., "Purring på manglende leveranser - [Supplier Name]" or "Reminder for Outstanding Orders - [Supplier Name]"). It is **not** part of the template itself.
3.  **Rendering:** `Handlebars.compile(template).compile(data)` is used to render the selected HTML template with the provided data.
4.  **Sending:** The rendered HTML and generated subject, along with the looked-up recipient email, are passed to `window.electron.sendEmail`. This likely triggers an IPC call to the main process to open the user's default email client via `mailto:`.

## Limitations of Current Implementation

- Templates are hardcoded and require code changes to modify.
- Only two language variants (NO/EN) are supported.
- Limited formatting options (only the `gt` helper).
- No UI for managing or previewing templates.
- Subject lines are fixed (apart from language and supplier name).
- No support for plain text alternatives or attachments via the template system.

## Related Files

- `src/renderer/services/emailService.ts`: Contains the hardcoded templates and rendering logic.
- `src/renderer/data/supplierEmails.json`: Stores the mapping between supplier names and email addresses.
- `src/main/main.ts` / `src/main/index.ts`: Likely contains the `sendEmail` IPC handler that uses `shell.openExternal` for `mailto:`.
