# Supplier Reminder Pro - Distribution Options

This document provides comprehensive information about the different distribution options available for Supplier Reminder Pro, including how to create and distribute each format.

## Available Distribution Formats

Supplier Reminder Pro can be distributed in the following formats:

1. **Standard Installer (NSIS)** - Traditional Windows installer with options for user-level or system-level installation
2. **MSI Package** - Microsoft Installer format for enterprise deployment
3. **Portable Version** - Self-contained application that runs without installation

## Building the Distribution Packages

### Prerequisites

- Node.js and npm installed
- Windows environment (for building Windows installers)
- Git repository cloned

### Building All Formats at Once

To build all distribution formats in one operation:

```bash
npm run distributions
```

This script will:

1. Build the application
2. Create all distribution formats (NSIS, MSI, Portable)
3. Package them together with documentation
4. Create a distributable ZIP file

The output will be in the `distributions` directory, with a timestamped folder containing all formats.

### Building Individual Formats

#### Standard NSIS Installer

```bash
npm run dist:nsis
```

Output: `release/Supplier-Reminder-Pro-[version]-setup.exe`

#### MSI Package

```bash
npm run dist:msi
```

Output: `release/Supplier-Reminder-Pro-[version]-Setup.msi`

#### Portable Version

```bash
npm run portable
```

Output: `portable/Supplier-Reminder-Pro-Portable.zip`

## Installation Options

### Standard Installer (NSIS)

#### Manual Installation

1. Double-click the `Supplier-Reminder-Pro-[version]-setup.exe` file
2. Select installation type:
   - "Install for all users" (requires admin rights)
   - "Install for current user only" (no admin rights required)
3. Choose installation directory
4. Complete the installation wizard

#### Silent Installation

For automated deployment:

```
# Install for all users (requires admin)
Setup.exe /S /ALLUSERS

# Install for current user only (no admin required)
Setup.exe /S /CURRENTUSER

# Install to a custom directory
Setup.exe /S /D=C:\CustomPath
```

### MSI Package

#### Manual Installation

1. Double-click the `Supplier-Reminder-Pro-[version]-Setup.msi` file
2. Follow the installation wizard

#### Silent Installation

For automated deployment:

```
# Basic silent install
msiexec /i Setup.msi /quiet

# Install for current user only
msiexec /i Setup.msi ALLUSERS=2 /quiet

# Install to a custom directory
msiexec /i Setup.msi INSTALLDIR="C:\CustomPath" /quiet

# Silent uninstall
msiexec /x Setup.msi /quiet
```

#### Group Policy Deployment

The MSI package can be deployed via Group Policy in domain environments:

1. Upload the MSI to a network share
2. Create a Group Policy Object in Active Directory
3. Configure the software installation policy
4. Select the MSI package from the network share
5. Configure deployment options (assigned or published)

### Portable Version

#### Usage

1. Extract the `Supplier-Reminder-Pro-Portable.zip` file to any location
2. Open the extracted folder
3. Run `Supplier Reminder Pro.exe` or the included batch file
4. All data will be stored in the `data` folder next to the executable

#### Notes

- No installation required
- No registry modifications
- No admin rights needed
- Can be run from USB drive
- To move the application, move the entire folder including the `data` directory

## Choosing the Right Distribution Format

| Format         | Advantages                                                                                                                                 | Disadvantages                                                              | Best For                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| NSIS Installer | - Familiar installation experience<br>- Start menu shortcuts<br>- Appears in Add/Remove Programs<br>- Can run with or without admin rights | - Modifies registry<br>- Required uninstallation                           | Most end users                                               |
| MSI Package    | - Enterprise deployment support<br>- Group Policy compatible<br>- Standardized installation<br>- Better corporate compliance               | - Usually requires admin rights<br>- Less customizable interface           | IT departments, corporate environments                       |
| Portable       | - No installation needed<br>- No admin rights required<br>- Runs from any location<br>- Good for restricted environments                   | - No shortcuts created<br>- Not in Add/Remove Programs<br>- Manual updates | Users with limited permissions, USB deployment, kiosk setups |

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

If you need to customize the distribution process further, you can modify the scripts in the `scripts` directory:

- `create-all-distributions.js` - Creates all distribution formats
- `create-portable.js` - Creates portable version
- `generate-icons.js` - Generates application icons

## Troubleshooting

### Common Issues

1. **Admin Rights Issues**

   - For non-admin installation, use NSIS installer with CURRENTUSER flag or use the portable version

2. **Missing Dependencies**

   - Ensure all dependencies are installed with `npm install`
   - Install native build tools if needed

3. **Build Errors**

   - Windows installers must be built on Windows due to native dependencies

4. **Silent Installation Failures**
   - Ensure paths don't contain spaces or wrap them in quotes
   - Check logs at `%TEMP%\Supplier-Reminder-Pro-Install-Log.txt`

### Support

For additional support or customization requirements, contact your application administrator or developer.
