# External Link Handling

The Supplier Reminder Pro application includes a robust system for securely handling external links, allowing users to access documentation, contact support, and interact with external resources while maintaining security.

## Overview

External link handling is an important part of desktop applications that need to interact with web resources. In Supplier Reminder Pro, this functionality allows:

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

- All URLs are validated before being opened
- Special handling is implemented for different platforms
- Detailed error reporting helps users troubleshoot issues
- Fallback mechanisms are provided when links cannot be opened

### Platform-Specific Features

The implementation includes special handling for different platforms:

- **Windows**: Additional options for handling `mailto:` links, which can be problematic on Windows
- **macOS**: Standard handling works well on macOS
- **Linux**: Standard handling with additional logging

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

```typescript
// In main process
ipcMain.handle("openExternalLink", async (_, url: string) => {
  try {
    // Validate URL
    if (!url || typeof url !== "string") {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Platform-specific handling
    const platform = process.platform;
    if (url.startsWith("mailto:") && platform === "win32") {
      // Special handling for mailto on Windows
      await shell.openExternal(url, {
        activate: true,
        workingDirectory: process.cwd(),
      });
    } else {
      // Standard handling
      await shell.openExternal(url);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      platform: process.platform,
      url,
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
    "https://github.com/Isuldra/Suppliers/wiki"
  );

  if (!result.success) {
    // Show error message with fallback options
    toast.error(
      <div>
        <p>Could not open documentation.</p>
        <p className="text-xs mt-1">
          Try opening the link manually:
          https://github.com/Isuldra/Suppliers/wiki
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
  const subject = encodeURIComponent("Supplier Reminder Pro Support");
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

The external link handler provides detailed error information:

```typescript
{
  success: false,
  error: "The error message",
  platform: "win32", // or "darwin", "linux"
  url: "the://url.that.failed"
}
```

This information helps with:

1. Providing useful error messages to users
2. Implementing platform-specific fallbacks
3. Debugging issues in different environments

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
