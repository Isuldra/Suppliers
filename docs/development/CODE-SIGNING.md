# Code Signing & Windows SmartScreen

## Problem

When users download executables from the internet, Windows may show SmartScreen warnings or block execution with:

**"Windows protected your PC - Windows Defender SmartScreen prevented an unrecognized app from starting"**

This happens because:

1. The executable is not code-signed
2. The file is downloaded from an "untrusted" source (internet)
3. Windows doesn't recognize the publisher

## Current Behavior

When a user downloads an .exe file:

1. File is saved with the "Zone.Identifier" alternate data stream
2. Windows detects it came from the internet
3. First run triggers SmartScreen warning
4. User must click "More info" → "Run anyway"

## Solutions

### Option 1: Code Signing Certificate (Recommended)

**Cost**: ~$200-400/year for EV certificate (Extended Validation)

**How it works**:

1. Purchase a code signing certificate from a trusted Certificate Authority
2. Configure electron-builder to sign executables during build
3. Signed executables won't trigger SmartScreen warnings

**Setup in `package.json`**:

```json
{
  "build": {
    "win": {
      "sign": {
        "certificateFile": "path/to/certificate.pfx",
        "certificatePassword": "password"
      }
    }
  }
}
```

**Documented but not implemented**: The build logs show signing attempts, but no actual certificate is configured.

### Option 2: Microsoft Defender SmartScreen Submission (Free)

**Process**:

1. Wait 7-30 days after first release
2. As users download and run the application, Microsoft collects telemetry
3. Eventually, the file becomes "known" and trusted
4. Requires thousands of downloads over time

**Limitations**:

- Requires time (weeks/months)
- Requires many downloads
- Not guaranteed
- First-time users still see warnings

### Option 3: User Instructions (Current Workaround)

Provide clear instructions for users who encounter the SmartScreen warning:

1. **Click "More info"**
2. **Click "Run anyway"**
3. **For subsequent updates**: The file will be in the same download location, so SmartScreen recognizes it

Alternatively, provide instructions to unblock the file:

1. Right-click the .exe file
2. Select "Properties"
3. Check "Unblock" at the bottom
4. Click "OK"

### Option 4: Reputation Building

- Publish to Microsoft Store (requires code signing + store account)
- Use Windows Package Manager (winget/chocolatey)
- Get more downloads to build reputation
- Time-based solution (can take months)

## Auto-Updater Implications

When `electron-updater` downloads an update:

1. File is downloaded to user's temp folder
2. Windows detects it came from the internet
3. **First installation may trigger SmartScreen**
4. User must confirm the installation

**Important**: This happens ONCE per version. Subsequent runs won't trigger SmartScreen for the same file.

## Admin Rights vs No Admin Rights

### With Admin Rights

- User can install updates without SmartScreen blocking
- Updates are installed system-wide
- Less friction for updates

### Without Admin Rights

- User-installed apps work fine
- Updates still work
- SmartScreen may still appear but doesn't require admin to unblock
- User just needs to click "Run anyway"

## Current Configuration

Looking at the logs:

```
• signing with signtool.exe  path=release/win-arm64-unpacked/OneMed SupplyChain.exe
```

This indicates electron-builder is TRYING to sign, but no certificate is configured, so it's essentially a no-op.

## Recommendations for Internal OneMed Application

Since this is an **internal company application** (not publicly distributed), the approach is different:

### Internal Distribution Strategy

**No Code Signing Needed** ✅

- Code signing certificates (~$200-400/year) are unnecessary for internal apps
- SmartScreen warnings are a one-time user experience
- Users trust the source (company IT/OneMed)

### What to Do Instead

**Short Term:**

1. ✅ Provide simple user instructions for first-time setup
2. ✅ Document the SmartScreen bypass process
3. ✅ Consider distributing via company file share or internal network
4. ✅ Create a quick guide for IT to distribute to users

**User Instructions to Provide:**

```
First Time Installation:

1. Download the installer from [location]
2. If Windows shows a SmartScreen warning:
   - Click "More info"
   - Click "Run anyway"
3. This only happens once - future updates are automatic!
```

**Alternative: Internal Distribution**

- Host files on company intranet
- Distribute via company file share
- Use internal deployment tools (Group Policy, etc.)
- Files downloaded from company network are more trusted by Windows

### If Code Signing is Required

**Only if company policy mandates it:**

- Check with IT department about certificates
- Many companies have Enterprise certificates
- May need to work with IT to sign executables
- OR request company buy a certificate for internal apps

### The Reality

For internal apps with <100 users:

- SmartScreen warning happens once per user
- Users learn to click "Run anyway"
- No ongoing costs or complexity
- Time spent on documentation > time saved avoiding warnings

## Testing SmartScreen Locally

To test what users will experience:

1. **Download a file from GitHub Releases** (don't use local build)
2. Check file properties for "Unblock" checkbox
3. Try running without unblocking
4. Confirm SmartScreen warning appears

## References

- [Microsoft Code Signing Docs](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/get-a-code-signing-certificate)
- [SmartScreen Overview](https://support.microsoft.com/en-us/windows/stay-protected-with-windows-security-2ae0363d-0ada-c064-8b56-6a39afb6a963)
- [Code Signing Best Practices](https://support.microsoft.com/en-us/topic/code-signing-best-practices-86eca7d-76a1-9f22-7df6-69e7eecb40fe)
