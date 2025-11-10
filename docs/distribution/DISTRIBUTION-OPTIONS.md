# SupplyChain OneMed - Distribution Options

This document provides comprehensive information about the different distribution options available for SupplyChain OneMed, including how to create and distribute each format.

## Available Distribution Formats

SupplyChain OneMed can be distributed in the following formats for Windows (builds for macOS/Linux may also be configured but focus here is Windows):

1. **Standard Installer (NSIS)** - Traditional Windows installer (`.exe`) allowing user-level (no admin) or machine-level installation.
2. **MSI Package** - Microsoft Installer format (`.msi`) often preferred for enterprise deployment via tools like Group Policy.
3. **Portable Version** - Self-contained application (`.exe`) that runs without installation.

## Building the Distribution Packages

### Prerequisites

- Node.js and npm installed
- Windows environment (recommended for building reliable Windows installers/portable versions due to native dependencies like `better-sqlite3`)
- Git repository cloned
- Build tools (Python, C++ via Visual Studio or `windows-build-tools`) installed.

### Building All Formats (via Custom Script)

_This uses a custom script. Building individual targets might be simpler._

```bash
npm run distributions
```

This script (`scripts/create-all-distributions.js`) aims to:

1. Build the application code.
2. Build multiple distribution formats (likely NSIS, MSI, Portable).
3. Package them together, potentially with documentation.
4. Create a distributable ZIP file in a `distributions` output folder.

_(Review the script for exact behavior and output location/format)._

### Building Individual Formats (Recommended)

Using the standard `electron-builder` scripts defined in `package.json` is often more straightforward:

#### Standard NSIS Installer

```bash
npm run dist:nsis
```

Output: `release/OneMed SupplyChain-[version]-setup.exe` (Filename based on `build.win.artifactName`)

#### MSI Package

```bash
npm run dist:msi
```

Output: `release/OneMed SupplyChain-[version]-Setup.msi` (Filename based on `build.msi.artifactName`)

#### Portable Version

```bash
npm run dist:portable
```

Output: `release/OneMed SupplyChain-Portable.exe` (Filename based on `build.portable.artifactName`)

_(Note: There is also an `npm run portable` script that uses `scripts/create-portable.js`. Prefer `npm run dist:portable` unless the custom script offers specific needed functionality.)_

## Installation Options

### Standard Installer (NSIS)

#### Manual Installation

1. Double-click the `OneMed SupplyChain-[version]-setup.exe` file.
2. Select installation type:
   - "Install for all users" (requires admin rights, requires `perMachine: true` in `build.nsis` config - currently `false`).
   - "Install for current user only" (no admin rights required - default behavior with current config).
3. Choose installation directory (allowed by current config `allowToChangeInstallationDirectory: true`).
4. Complete the installation wizard.

#### Silent Installation

For automated deployment:

```bash
# Install for current user only (no admin required - default behavior)
.\\"OneMed SupplyChain-1.0.0-setup.exe" /S /CURRENTUSER

# Install to a custom directory (for current user)
.\\"OneMed SupplyChain-1.0.0-setup.exe" /S /CURRENTUSER /D=C:\CustomPath

# (Requires build.nsis.perMachine=true and admin rights)
# .\\"OneMed SupplyChain-1.0.0-setup.exe" /S /ALLUSERS
```

_Replace filename with the actual version._

### MSI Package

#### Manual Installation

1. Double-click the `OneMed SupplyChain-[version]-Setup.msi` file.
2. Follow the installation wizard (configured for current user by default `perMachine: false`).

#### Silent Installation

For automated deployment:

```bash
# Basic silent install (for current user by default)
msiexec /i "OneMed SupplyChain-1.0.0-Setup.msi" /quiet

# Explicitly for current user (redundant with current config but good practice)
msiexec /i "OneMed SupplyChain-1.0.0-Setup.msi" ALLUSERS=2 /quiet

# Install to a custom directory (for current user)
msiexec /i "OneMed SupplyChain-1.0.0-Setup.msi" INSTALLDIR="C:\CustomPath" ALLUSERS=2 /quiet

# Silent uninstall
msiexec /x "OneMed SupplyChain-1.0.0-Setup.msi" /quiet
```

_Replace filename with the actual version._

#### Group Policy Deployment

The MSI package can be deployed via Group Policy in domain environments:

1. Upload the MSI to a network share accessible by target machines.
2. Create or edit a Group Policy Object (GPO) linked to the target users/computers.
3. Navigate to User Configuration (or Computer Configuration) > Policies > Software Settings > Software installation.
4. Right-click > New > Package... Select the MSI from the network share.
5. Choose deployment method (Assigned is typical for mandatory installs).

### Portable Version

#### Usage

1. Obtain the `OneMed SupplyChain-Portable.exe` file.
2. Place the `.exe` file in any desired location (local drive, USB drive, network share).
3. Run `OneMed SupplyChain-Portable.exe` directly.

#### Notes

- No installation required.
- No registry modifications are typically made by the application itself.
- No admin rights needed to run the application.
- Can be run from a USB drive.
- **Data Storage:** Application data (like the `app.sqlite` database, logs, settings) is **NOT** stored next to the executable. It is stored in the standard user application data directory, typically `%LOCALAPPDATA%\one-med-supplychain-app` on Windows (derived from `name` in `package.json`). This means user data remains on the machine even if the portable `.exe` is moved or deleted.

## Choosing the Right Distribution Format

| Format         | Advantages                                                                                                                                            | Disadvantages                                                                                                         | Best For                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| NSIS Installer | - Familiar installation experience<br>- Start menu/desktop shortcuts<br>- Appears in Add/Remove Programs<br>- Can install for current user (no admin) | - Modifies system slightly (installs files)<br>- Requires uninstallation                                              | Most individual end users                                     |
| MSI Package    | - Enterprise deployment (GPO)<br>- Standardized installation/uninstallation<br>- Better corporate compliance                                          | - Usually associated with admin rights (though per-user possible)<br>- Less flexible UI                               | IT departments, corporate environments, managed deployments   |
| Portable       | - No installation needed<br>- No admin rights required<br>- Runs from any location<br>- Good for restricted environments/kiosks/USB drives            | - No shortcuts created<br>- Not in Add/Remove Programs<br>- Manual updates<br>- **Data stored separately in AppData** | Users with limited permissions, temporary use, USB deployment |

## Advanced Configuration

### Customizing Installers

The installer configurations can be modified in `package.json` under the `build` section:

```json
"build": {
  // NSIS installer configuration
  "nsis": { ... },

  // MSI package configuration
  "msi": { ... },

  // Portable version configuration
  "portable": { ... }
}
```

### Creating a Custom Distribution Script

If you need to customize the distribution process further, you can examine and modify the scripts in the `scripts` directory:

- `create-all-distributions.js` - Example script to build and package multiple formats.
- `create-portable.js` - Example custom script for portable version creation.
- `generate-icons.js` - Script for generating application icons from source.

## Troubleshooting

### Common Issues

1. **Admin Rights Issues**
   - Ensure `perMachine` is `false` in `nsis` or `msi` config for per-user installs.
   - Use the Portable version if installation is prohibited.

2. **Missing Dependencies**
   - Ensure `npm install` was run before building.
   - Ensure build tools (Python/C++) are correctly installed on the build machine.

3. **Build Errors**
   - Windows targets should be built on Windows.
   - Check logs from `electron-builder` for specific errors.

4. **Silent Installation Failures**
   - Ensure paths in commands (like `/D=` or `INSTALLDIR=`) are valid and properly quoted if they contain spaces.
   - Check MSI logs (`msiexec /i ... /L*v install.log`) or NSIS logs (if enabled) for errors.

### Support

For additional support or customization requirements, contact your application administrator or developer.
