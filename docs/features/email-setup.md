# Email Setup Instructions

## Environment Variable Configuration

## Authentication Options

The application supports multiple authentication methods for Office 365 email:

### Option 1: SSO/Azure AD Authentication (Recommended for SSO environments)

If your organization uses SSO with Microsoft Authenticator, the application will attempt to use existing authentication sessions. This works when:

- You have an active Azure AD session
- You're logged into Office 365 in your browser
- You have the Azure PowerShell module installed

### Option 2: Device Code Authentication

For SSO environments, the application will try device code authentication, which allows you to authenticate using a web browser even in non-interactive environments.

### Option 3: App Password (Fallback)

**REQUIRED as fallback**: If SSO methods fail, you MUST set up an environment variable with an Office 365 app password.

### Setting the Environment Variable

#### On macOS/Linux:

```bash
export ONEMED_EMAIL_PASSWORD="Matheoboy2015!!"
```

#### On Windows:

```cmd
set ONEMED_EMAIL_PASSWORD=your_actual_password_here
```

#### For PowerShell on Windows:

```powershell
$env:ONEMED_EMAIL_PASSWORD = "Matheoboy2015!!"
```

### Important Security Notes

1. **Use App Passwords**: If your Office 365 account has Multi-Factor Authentication (MFA) enabled, you must use an App Password instead of your regular password.

2. **Never commit passwords to version control**: The environment variable approach ensures your password is not stored in the code.

3. **No hardcoded passwords**: The application is designed to fail securely if the environment variable is not set, preventing accidental exposure of credentials.

4. **Required for all environments**: Both development and production environments must use environment variables.

### How to Generate an App Password (if MFA is enabled)

1. Go to https://account.microsoft.com/security
2. Sign in with your Office 365 account
3. Go to "Security" → "Advanced security options"
4. Under "App passwords", click "Create a new app password"
5. Give it a name like "OneMed Supply Chain App"
6. Copy the generated password and use it as your `ONEMED_EMAIL_PASSWORD`

### Testing the Setup

The application will try authentication methods in this order:

1. **Check for existing Exchange Online session** - Uses any active PowerShell session
2. **Check for Azure AD context** - Uses existing Azure authentication if available
3. **Device code authentication** - Opens browser for SSO authentication
4. **Interactive authentication** - Standard Office 365 login (may not work in non-interactive mode)
5. **SMTP fallback** - Uses app password from environment variable

### For SSO Environments (Recommended)

1. **First, try without setting the environment variable** - The app may work with your existing SSO session
2. **If that fails, set the environment variable as fallback**:
   ```bash
   export ONEMED_EMAIL_PASSWORD="Matheoboy2015!!"
   ```

### For Non-SSO Environments

You must set the environment variable:

```bash
export ONEMED_EMAIL_PASSWORD="Matheoboy2015!!"
```

### Troubleshooting

- If you see "ONEMED_EMAIL_PASSWORD environment variable is not set", you need to set the environment variable
- If you get authentication errors, verify your password is correct and that you're using an App Password if MFA is enabled
- Check that the email address `supply.planning.no@onemed.com` has the necessary permissions to send emails
