# Quick Guide: GitHub Token Setup (Local Development)

## ✅ Status: Already Configured!

Your GitHub token is already set up in `~/.zshrc`!

## 🚀 Using Your Token

### Option 1: Reload Your Shell (Recommended)

```bash
source ~/.zshrc
```

### Option 2: Export in Current Session

```bash
export GITHUB_TOKEN=your_github_token_here
```

## ✅ Verify It's Working

```bash
# Check if token is set
echo $GITHUB_TOKEN

# Should show your token (mask the output)
echo $GITHUB_TOKEN | sed 's/./*/g'
```

## 🎯 When Do You Need This?

**You DON'T need this for:**

- ✅ Pushing to GitHub (normal commits)
- ✅ GitHub Actions (automatic release creation)
- ✅ Deploying to Cloudflare Pages

**You DO need this for:**

- 🔧 Testing `npm run release:github` locally
- 🔧 Manually creating releases from your computer

## 💡 Important Note

**For most releases, you don't need to do anything!**

Just push a tag:

```bash
git tag v1.3.2
git push origin v1.3.2
```

GitHub Actions will handle everything automatically!

## 🔐 Security

- Your token is stored in `~/.zshrc`
- It's automatically loaded when you open a new terminal
- **Never commit this token to Git** (it's already in `.gitignore`)

## 🐛 Troubleshooting

If `echo $GITHUB_TOKEN` shows nothing:

```bash
# Reload your shell config
source ~/.zshrc

# Or restart your terminal
```

If token is expired or needs to be regenerated:

1. Go to: https://github.com/settings/tokens
2. Create a new token with `repo` scope
3. Update in `~/.zshrc`:
   ```bash
   nano ~/.zshrc
   # Find the line with GITHUB_TOKEN and update it
   ```
4. Reload: `source ~/.zshrc`
