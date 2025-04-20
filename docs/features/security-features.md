# Security Features

This document provides detailed information about the security features implemented in SupplyChain OneMed.

## Overview

Security is a fundamental aspect of SupplyChain OneMed, ensuring that sensitive business data is protected while maintaining usability. The application implements multiple layers of security based on Electron security best practices and industry standards, although some configurations deviate from default recommendations.

## Electron Security Measures

### Context Isolation & Node Integration

The application implements key process isolation features:

- **Context Isolation (`contextIsolation: true`)**: Enabled in `webPreferences`, ensuring preload scripts run in a separate context from the renderer.
- **Node Integration Disabled (`nodeIntegration: false`)**: Enabled in `webPreferences`, preventing the renderer process from directly accessing Node.js APIs.
- **Preload Scripts & Context Bridge**: A preload script (`src/preload/index.ts`) uses `contextBridge` to securely expose a limited, well-defined API (`window.electron`) to the renderer process.
- **Secure IPC Communication**: The preload script includes validation (`validSendChannels`, `validReceiveChannels`) to ensure only explicitly allowed IPC channels are used for communication between processes.

### Sandbox

- **Sandbox Disabled (`sandbox: false`)**: Note that the Electron sandbox is currently **disabled** in the `webPreferences`. While potentially necessary for certain integrations, this reduces the process isolation compared to the recommended default (`sandbox: true`) and increases the potential impact of a compromised renderer process. Enabling the sandbox is a recommended future enhancement (see `docs/planning/planned-features.md`).

### Content Security Policy (CSP)

A strict Content Security Policy (CSP) is defined in the main process (`src/main/main.ts`):

```javascript
// Defined cspPolicy object
const cspPolicy = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"], // 'unsafe-inline' might be needed for some UI libraries
  "img-src": ["'self'", "data:", "blob:"], // Added blob: for potential image operations
  "font-src": ["'self'"],
  "connect-src": ["'self'"], // Restricts fetch/XHR/WebSockets
  "worker-src": ["'self'", "blob:"], // Added blob: for potential worker usage
  "object-src": ["'none'"],
  "frame-src": ["'none'"], // Disallows embedding frames
};
```

**CSP Application Note:** The CSP header application currently occurs within the `createWindow` function (`cspListener`), separate from where other security headers are applied (`securityHeadersListener` in `app.whenReady`). This approach might lead to unexpected behavior or conflicts. Consolidating all security header application into a single `onHeadersReceived` listener is recommended (see `docs/planning/planned-features.md`).

### Secure Headers

Additional HTTP security headers are applied via `session.defaultSession.webRequest.onHeadersReceived` (`securityHeadersListener` in `src/main/main.ts`):

- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `SAMEORIGIN`
- **X-XSS-Protection**: `1; mode=block`

These headers provide additional protection against MIME type sniffing and clickjacking.

## Data Security

### Local Storage Protection

Data stored locally is protected through:

- **Secure Storage Location**: Application data (including the SQLite database) is stored in standard protected OS user data directories.
- **SQLite Database**: Uses `better-sqlite3` which operates on local files.
- **Database Encryption**: Database encryption (e.g., via SQLCipher) is **not currently implemented**.

### Sensitive Data Handling

- **Input Validation**: Basic validation occurs in places (e.g., IPC handlers), but comprehensive validation/sanitization should be reviewed.
- **Parameter Binding**: SQL queries use `better-sqlite3` prepared statements, which correctly handle parameter binding to prevent SQL injection.
- **External Communication URL Validation**: The `openExternalLink` handler currently does **not** perform explicit URL validation before passing to `shell.openExternal`.

## Application Integrity

### Code Signing

- **Configuration**: The `package.json` includes configuration for code signing (`build.win.publisherName`). Actual signing occurs during the build/release process.

### Update Security

- **Mechanism**: Uses `electron-updater`.
- **Verification**: `electron-updater` automatically verifies the digital signature of downloaded updates if the publisher information is correctly configured in the build.
- **Channel Security**: Since updates are published manually, the security of the download channel depends on where the artifacts (`latest.yml`, installers) are hosted.

### Error and Exception Handling

- **Basic Handling**: `try/catch` blocks are used in various places (e.g., IPC handlers, database service).
- **Logging**: Errors are logged using `electron-log`.

## Audit and Logging

### Logging Implementation

- **General Logging**: Uses `electron-log` for application events and errors.
- **Database Audit Log**: The `DatabaseService` includes a `logOperation` method that writes basic CRUD actions (insert, update, delete) on certain tables to an `audit_log` table within the SQLite database.
- **Log Protection/Rotation**: Advanced features like automatic log rotation or redaction rely on `electron-log`'s capabilities and configuration (currently basic file logging is set up).

## Operational Security

### Installation and Deployment

- **Build Targets**: Builds produce standard installers (MSI, NSIS - configured for current user), portable versions, and DMG (macOS).
- **Permissions**: Application generally runs with standard user permissions.

## Implementation Details

### Secure IPC Example

The pattern used involves defining handlers in the main process and exposing limited functions via `contextBridge` in the preload script.

```typescript
// In main process (Example: Actual openExternalLink handler)
ipcMain.handle("openExternalLink", async (_, url: string) => {
  // Note: No explicit validation here in current code
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    // Error handling exists
    log.error(`Error opening external link ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// In preload script (context bridge implementation)
contextBridge.exposeInMainWorld("electron", {
  // Only expose specific functions checked against validSendChannels/validReceiveChannels
  openExternalLink: (url) => ipcRenderer.invoke("openExternalLink", url),
  // Other safe APIs exposed...
});
```

### Content Security Policy & Headers Implementation

```typescript
// In main process (Simplified - showing the two separate listeners)

// Listener in app.whenReady() for security headers
securityHeadersListener = (details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      "X-Content-Type-Options": ["nosniff"],
      "X-Frame-Options": ["SAMEORIGIN"],
      "X-XSS-Protection": ["1; mode=block"],
    },
  });
};
session.defaultSession.webRequest.onHeadersReceived(securityHeadersListener);

// Listener in createWindow() for CSP
cspListener = (details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      "Content-Security-Policy": [
        /* Generated CSP string */
      ],
    },
  });
};
session.defaultSession.webRequest.onHeadersReceived(cspListener);
```

_Note: This separation is potentially problematic; consolidation is recommended._

## Best Practices for Users

1. **Keep Updated**: Always install application updates promptly
2. **Strong Passwords**: Use strong, unique passwords for system accounts
3. **Lock Workstations**: Lock workstations when unattended
4. **Secure Environment**: Run the application in a secure, controlled environment
5. **Report Issues**: Report any security concerns or unusual behavior

## Troubleshooting

Common security-related issues and their solutions:

1. **Permission Issues**: Check system permissions for application data directory
2. **Update Failures**: Verify network connectivity and proxy settings
3. **Database Access Problems**: Check database file permissions
4. **SSL/TLS Errors**: Verify system time and certificate trust settings
5. **Authentication Failures**: Check credentials and account status

## Related Features

- [External Links](external-links.md) - Secure handling of external links
- [Database Storage](database-storage.md) - Secure database implementation
- [Backup and Restore](backup-restore.md) - Secure backup and recovery procedures
