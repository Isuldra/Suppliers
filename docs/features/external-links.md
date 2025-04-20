# External Link Handling

The SupplyChain OneMed application includes a robust system for securely handling external links, allowing users to access documentation, contact support, and interact with external resources while maintaining security.

## Overview

External link handling is an important part of desktop applications that need to interact with web resources. In SupplyChain OneMed, this functionality allows:

- Opening documentation and help resources in the user's default browser
- Launching the user's default email client with pre-filled support emails
- Accessing external resources while maintaining the security of the application

## Implementation Details

### Architecture

The external link functionality follows Electron's security best practices:

1. **Renderer Process**: React components request to open links through a secure IPC channel
2. **Preload Script**: Exposes a limited API to the renderer process
3. **Main Process**: Validates URLs and uses Electron's `shell.openExternal` API to open links securely

### Security Considerations

- All URLs are passed to the OS default handler via `shell.openExternal`.
- The main process handler uses Electron's `shell.openExternal` API.
- Error reporting captures failures during the `shell.openExternal` call.
- Fallback mechanisms (e.g., showing error messages) should be implemented in the renderer process.

### Platform-Specific Features

The implementation uses `shell.openExternal` directly, which generally handles platform differences appropriately. The previously documented special handling for `mailto:` links on Windows is not present in the current code.

## API Reference

### Renderer Process API

```typescript
// Interface in window.electron
openExternalLink: (url: string) =>
  Promise<{ success: boolean; error?: string }>;

// Usage example
const result = await window.electron.openExternalLink(url);
if (result.success) {
  console.log("Link opened successfully");
} else {
  console.error("Failed to open link:", result.error);
}
```

### Main Process Handler

The actual handler implemented in `src/main/main.ts` and `src/main/index.ts` is simpler:

```typescript
// In main process (e.g., src/main/main.ts)
ipcMain.handle("openExternalLink", async (_, url: string) => {
  try {
    log.info(`Attempting to open external link: ${url}`); // Added logging
    // No explicit URL validation here; relies on shell.openExternal
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    log.error(`Error opening external link ${url}:`, error); // Added logging
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      // Note: platform and url are not included in the actual return object
    };
  }
});
```

## Usage Examples

### Opening Documentation

```typescript
// In a Help Menu component
const handleOpenDocumentation = async () => {
  const result = await window.electron.openExternalLink(
    "https://github.com/your-github-username/supplychain-onemed/wiki"
  );

  if (!result.success) {
    // Show error message with fallback options
    toast.error(
      <div>
        <p>Could not open documentation.</p>
        <p className="text-xs mt-1">
          Try opening the link manually:
          https://github.com/your-github-username/supplychain-onemed/wiki
        </p>
      </div>
    );
  }
};
```

### Opening Email Client

```typescript
// In a Support Button component
const handleContactSupport = async () => {
  // Encode subject and body for mailto URL
  const subject = encodeURIComponent("SupplyChain OneMed Support");
  const body = encodeURIComponent("Please describe your issue here...");
  const email = "support@example.com";

  const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

  const result = await window.electron.openExternalLink(mailtoUrl);

  if (!result.success) {
    // Show error with fallback
    toast.error("Could not open email client.");

    // Copy email to clipboard as fallback
    navigator.clipboard
      .writeText(email)
      .then(() => toast.info("Email address copied to clipboard"))
      .catch((err) => console.error("Could not copy to clipboard:", err));
  }
};
```

## Error Handling

If `shell.openExternal` fails in the main process, the Promise returned to the renderer process via `window.electron.openExternalLink` will resolve to an object indicating failure:

```typescript
{
  success: false,
  error: "The error message from shell.openExternal or the catch block"
  // Note: platform and the original url are NOT included in the actual response
}
```

This information allows the renderer process to:

1.  Display appropriate error messages to the user.
2.  Implement fallback mechanisms (e.g., copying the link to the clipboard).
3.  Log the error for debugging.

## Best Practices

When using the external link functionality:

1. Always handle errors and provide fallback options
2. Validate URLs before sending them to the API
3. Be cautious with user-provided URLs
4. Consider platform differences, especially for mailto: links
5. Use URL encoding for special characters in mailto: links

## Additional Resources

For more information on secure handling of external links in Electron applications, refer to:

- [Electron Security Documentation](https://www.electronjs.org/docs/latest/tutorial/security)
- [Shell API Documentation](https://www.electronjs.org/docs/latest/api/shell)
