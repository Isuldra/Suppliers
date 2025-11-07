# Slack CHANGELOG Integration

This document describes how to automatically send CHANGELOG entries to Slack after releases.

## Overview

The Slack CHANGELOG integration allows you to automatically send formatted release notes from `CHANGELOG.md` to a Slack channel via webhook. This is useful for keeping your team informed about new releases and changes.

## Setup

### 1. Get Slack Webhook URL

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack** or **Add new webhook**
4. Select the channel where you want notifications
5. Copy the webhook URL (format: `https://hooks.slack.com/services/...`)

### 2. Configure Webhook URL

#### For GitHub Actions (Automatic - Recommended)

**This is the recommended way for automatic notifications on push:**

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Your Slack webhook URL (e.g., `https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXXX/XXXXXXX`)
6. Click **Add secret**

After this, Slack notifications will automatically trigger when you push tags to GitHub.

#### For Local Usage (Manual)

You have two options:

**Option A: Environment Variable**

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Option B: Command Line Argument**

Pass it directly when running the script:

```bash
node scripts/send-changelog-to-slack.js 1.3.8 https://hooks.slack.com/services/...
```

## Usage

### Send Latest CHANGELOG Entry

To send the latest version entry from CHANGELOG.md:

```bash
# Using environment variable
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." npm run slack:changelog:latest

# Or using the script directly
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." node scripts/send-changelog-to-slack.js
```

### Send Specific Version

To send a specific version entry:

```bash
# Using environment variable
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." node scripts/send-changelog-to-slack.js 1.3.8

# Or passing webhook as argument
node scripts/send-changelog-to-slack.js 1.3.8 https://hooks.slack.com/services/...
```

### Custom Display Name

You can customize the display name shown in Slack notifications:

```bash
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." \
SLACK_DISPLAY_NAME="Release Team" \
node scripts/send-changelog-to-slack.js
```

## Integration with Release Workflow

### Automatic Triggering (GitHub Actions)

**Slack notifications are now automatically triggered when you push tags to GitHub!**

The workflow is already configured in `.github/workflows/release.yml` and `.github/workflows/build.yml`.

**All you need to do:**

1. Set up the `SLACK_WEBHOOK_URL` secret in GitHub (see Setup section above)
2. Push a tag as usual:

   ```bash
   # 1. Bump version
   npm run version:bump

   # 2. Build and prepare
   npm run dist:clean
   npm run release:prepare

   # 3. Commit and push (this triggers Slack notification automatically!)
   git add .
   git commit -m "chore: Prepare Cloudflare deployment for v1.3.8"
   git push origin main --follow-tags
   ```

When you push a tag, GitHub Actions will:

- Build the application
- Create GitHub Release
- **Automatically send CHANGELOG to Slack** (if `SLACK_WEBHOOK_URL` secret is set)

### Manual Release (Local Testing)

If you want to test locally before pushing:

```bash
# 1. Bump version
npm run version:bump

# 2. Build and prepare
npm run dist:clean
npm run release:prepare

# 3. Send CHANGELOG to Slack manually
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." npm run slack:changelog:latest

# 4. Commit and push
git add .
git commit -m "chore: Prepare Cloudflare deployment for v1.3.8"
git push origin main --follow-tags
```

## How It Works

1. **Parser** (`scripts/parse-changelog.js`):

   - Parses `CHANGELOG.md` to extract version entries
   - Extracts title, description, completion date, and sections
   - Supports both latest version and specific version queries

2. **Formatter** (`scripts/send-changelog-to-slack.js`):

   - Formats CHANGELOG entry into Slack Block Kit format
   - Includes metadata (version, date, release info)
   - Truncates long sections to avoid message limits
   - Adds link to full CHANGELOG on GitHub

3. **Slack Integration**:
   - Sends formatted message to Slack via webhook
   - Uses Slack Block Kit for rich formatting
   - Includes fallback text for notifications

## Message Format

The Slack message includes:

- **Header**: Release version with emoji
- **Title & Description**: Main release information
- **Metadata**:
  - Completion date
  - Release timestamp
  - Released by (display name)
- **Key Sections**: First 3 sections from CHANGELOG (truncated if too long)
- **Link**: Direct link to full CHANGELOG on GitHub

## Troubleshooting

### Error: "Invalid Slack webhook URL"

Make sure your webhook URL starts with `https://hooks.slack.com/services/`

**Common issue:** If you copied the URL incorrectly, it might have duplicate prefixes like:

```
https://hooks.slack.com/services/https://hooks.slack.com/services/...
```

The script automatically fixes this, but make sure your URL is correct when setting it up.

### Notifications not appearing in Slack

1. **Check GitHub Actions logs:**

   - Go to your repository on GitHub
   - Click **Actions** tab
   - Find the latest workflow run
   - Check the "Send CHANGELOG to Slack" step for errors

2. **Verify secret is set:**

   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Make sure `SLACK_WEBHOOK_URL` exists and is correct

3. **Test webhook manually:**
   ```bash
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." node scripts/send-changelog-to-slack.js 1.3.8
   ```

### Error: "Version not found in CHANGELOG"

- Verify the version exists in `docs/CHANGELOG.md`
- Check the version format matches exactly (e.g., `1.3.8`)

### Error: "No CHANGELOG entries found"

- Ensure `docs/CHANGELOG.md` exists
- Check that the file has at least one version entry

### Message Too Long

Slack has message limits. The script automatically:

- Truncates sections longer than 1000 characters
- Limits to first 3 sections
- Shows a note if more sections exist

## Examples

### Example 1: Send Latest Release

```bash
SLACK_WEBHOOK_URL="<your-slack-webhook-url>" \
npm run slack:changelog:latest
```

### Example 2: Send Specific Version with Custom Name

```bash
SLACK_WEBHOOK_URL="<your-slack-webhook-url>" \
SLACK_DISPLAY_NAME="Andreas" \
node scripts/send-changelog-to-slack.js 1.3.8
```

### Example 3: Test Parser Only

To test the parser without sending to Slack:

```bash
node scripts/parse-changelog.js 1.3.8
```

This will output JSON with the parsed CHANGELOG entry.

## Integration with App Settings

The app also has built-in Slack integration in `SettingsModal.tsx` that allows users to:

- Enable/disable Slack notifications
- Configure webhook URL
- Set display name

This is used for runtime notifications (e.g., when emails are sent). The CHANGELOG script is separate and designed for release workflows.

## Security Notes

- ⚠️ **Never commit webhook URLs to git**
- Use environment variables or GitHub Secrets
- Rotate webhook URLs if they're exposed
- Webhook URLs should be kept private

## Related Files

- `scripts/parse-changelog.js` - CHANGELOG parser utility
- `scripts/send-changelog-to-slack.js` - Slack notification script
- `src/renderer/services/slackService.ts` - Slack service (includes CHANGELOG formatting)
- `docs/CHANGELOG.md` - Release changelog
