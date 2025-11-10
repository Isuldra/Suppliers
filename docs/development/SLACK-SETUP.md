# Quick Setup: Slack CHANGELOG Notifications

## One-Time Setup (5 minutes)

### Step 1: Get Slack Webhook URL

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack** or **Add new webhook**
4. Select the channel where you want notifications
5. Copy the webhook URL (format: `https://hooks.slack.com/services/YOUR/WEBHOOK/PATH`)

**Important:** Make sure the URL starts with `https://hooks.slack.com/services/` and doesn't have duplicate prefixes.

### Step 2: Add to GitHub Secrets

1. Go to your GitHub repository: https://github.com/Isuldra/Suppliers
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste your Slack webhook URL
6. Click **Add secret**

### Step 3: Test It

To test that it works, you can manually trigger a notification:

```bash
# Test with the latest version
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
node scripts/send-changelog-to-slack.js
```

Or test with a specific version:

```bash
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
node scripts/send-changelog-to-slack.js 1.3.8
```

## That's It! 🎉

Now, every time you push a tag to GitHub, Slack will automatically receive a formatted CHANGELOG notification.

### How It Works

When you push a tag (like `v1.3.8`), GitHub Actions will:

1. Build the application
2. Create GitHub Release
3. **Automatically send CHANGELOG to Slack** ✨

### Example Workflow

```bash
# 1. Bump version (creates tag v1.3.8)
npm run version:bump

# 2. Build and prepare
npm run dist:clean
npm run release:prepare

# 3. Commit and push (this triggers Slack notification automatically!)
git add .
git commit -m "chore: Prepare Cloudflare deployment for v1.3.8"
git push origin main --follow-tags
```

## Troubleshooting

### Notifications not appearing in Slack?

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

### Webhook URL has duplicate prefix?

If you see an error about invalid webhook URL, check that it doesn't have duplicate prefixes like:

```
https://hooks.slack.com/services/https://hooks.slack.com/services/...
```

The script automatically fixes this, but make sure your URL in GitHub Secrets is correct.

## Need More Details?

See the full documentation: [SLACK-CHANGELOG.md](./SLACK-CHANGELOG.md)
