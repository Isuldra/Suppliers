# Email Setup

## How Email Sending Actually Works

Pulse does **not** use SMTP, an app password, or any stored credential. Email is sent through
**Outlook automation on Windows**, driven from the main process
(`src/main/index.ts`) and orchestrated from `src/renderer/services/emailService.ts`.

There is no environment variable to configure and no password to set up. The
application relies entirely on the user already being signed into the desktop
Outlook client on their Windows machine.

### Sending flow (with automatic fallback)

`EmailService.sendReminder()` tries three methods in order, falling back if one fails:

1. **`sendEmailViaEmlAndCOM`** (preferred): writes the message to a temporary
   `.eml` file and uses Outlook's COM automation (via a PowerShell script spawned
   with `child_process.spawn('powershell', ...)`, script piped over stdin) to
   import and send it directly.
2. **`sendEmailAutomatically`**: a more defensive variant of the same
   HTML + Outlook COM approach, also via a temporary file.
3. **`sendEmail`**: final fallback — writes the `.eml` file and opens it, requiring
   the user to click send in Outlook.

All three ultimately go through Outlook already running/configured on the
user's machine — none of them talk to an SMTP server or ask for a password.

### Sender address per country

The "from" identity is not user-configurable. It is derived from the supplier's
country (see `getSenderEmailForCountry()` in both
`src/renderer/services/emailService.ts` and `src/main/index.ts`):

| Country | Sender address              |
| ------- | ---------------------------- |
| Denmark | `indkoeb.dk@onemed.com`      |
| Norway  | `supply.planning.no@onemed.com` |
| Sweden  | `supply.planning.no@onemed.com` (placeholder, no dedicated SE address yet) |
| Finland | `supply.planning.no@onemed.com` (placeholder, no dedicated FI address yet) |

### Requirements

- Windows only. Outlook COM automation does not work on macOS/Linux.
- The desktop Outlook client must be installed and the user signed in.
- PowerShell must be available and allowed to run (`-ExecutionPolicy Bypass`
  is used for the spawned script only, not system-wide).

### Troubleshooting

- **Nothing happens / "Run anyway" style prompts**: confirm Outlook is
  installed, running, and the user has an active mail profile.
- **All three send attempts fail**: check the application logs
  (`electron-log`) for the PowerShell stderr/stdout captured for each attempt.
- **Wrong sender address**: verify the detected country for the supplier —
  the sender is picked automatically and cannot currently be overridden per
  message.

There is no MFA, app-password, device-code, or SSO/Azure AD flow in the
current codebase. Earlier revisions of this document described an
environment-variable-based SMTP password fallback; that code path no longer
exists in the application.
