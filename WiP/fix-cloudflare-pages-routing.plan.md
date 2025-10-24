<!-- 124a6964-f700-48c3-8d5e-abb5755820bd fd8a4923-adae-4edd-a78a-ac8b7c086b52 -->
# Fix Cloudflare Pages Routing for Auto-Updates

## Problem

Cloudflare Pages is serving `index.html` as a fallback for all requests, including `latest.yml`. The `_redirects` file is not working correctly, causing electron-updater to receive HTML instead of YAML.

## Root Causes

1. Build command `npm run deploy:cloudflare` is unnecessary for a static site
2. Cloudflare Pages SPA routing is interfering with file serving
3. `_redirects` format may need adjustment
4. Missing `_headers` file to set correct Content-Type for YAML

## Solution

### 1. Fix `_redirects` File Format

Update `/docs/updates/_redirects` to use proper Cloudflare Pages format:

```
/latest.yml   /latest.yml   200!
/latest.json  /latest.json  200!
/*.exe        /:splat.exe   200!
/*.blockmap   /:splat.blockmap   200!
/             /index.html   200
```

The `!` at the end forces the rule and prevents fallback to SPA routing.

### 2. Create `_headers` File

Create `/docs/updates/_headers` to set correct Content-Type:

```
/latest.yml
  Content-Type: text/yaml
  Cache-Control: no-cache

/latest.json
  Content-Type: application/json
  Cache-Control: no-cache

/*.exe
  Content-Type: application/octet-stream

/*.blockmap
  Content-Type: application/octet-stream
```

### 3. Update Cloudflare Pages Build Settings

Change build command in Cloudflare Pages dashboard:

- Build command: Leave empty or set to `echo "Static site"`
- Build output: `docs/updates` (already correct)
- Root directory: `/` (already correct)

### 4. Test After Deployment

After changes are pushed and deployed:

1. Visit `https://suppliers-anx.pages.dev/latest.yml` in browser
2. Should see YAML content, not HTML
3. Check response headers for `Content-Type: text/yaml`
4. Run app and check for updates

## Files to Modify

- `/docs/updates/_redirects` - Add `!` to force routing
- `/docs/updates/_headers` - Create new file for Content-Type headers

### To-dos

- [ ] Update _redirects file to use ! flag to force routing and prevent SPA fallback
- [ ] Create _headers file to set correct Content-Type for YAML, JSON, and executable files
- [ ] Document how to update Cloudflare Pages build settings to empty or static command
- [ ] Test that latest.yml is served correctly after deployment