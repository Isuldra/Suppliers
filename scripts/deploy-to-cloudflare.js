import fs from "fs";
import path from "path";
import crypto from "crypto";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const releaseDir = path.join(__dirname, "..", "release");
const cloudflareDir = path.join(__dirname, "..", "docs", "updates");

// Create updates directory for Cloudflare Pages
if (!fs.existsSync(cloudflareDir)) {
  fs.mkdirSync(cloudflareDir, { recursive: true });
}

// Get version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);
const version = packageJson.version;

console.log(`🚀 Deploying version ${version} to Cloudflare Pages...`);

// Copy release files to Cloudflare directory
const files = fs.readdirSync(releaseDir);
const releaseFiles = files.filter(
  (f) => f.endsWith(".exe") || f.endsWith(".zip") || f.endsWith(".yml")
);

console.log(`📁 Found ${releaseFiles.length} release files:`);
releaseFiles.forEach((file) => {
  const src = path.join(releaseDir, file);
  const dest = path.join(cloudflareDir, file);
  fs.copyFileSync(src, dest);
  console.log(`  ✅ Copied ${file}`);
});

// Generate latest.json for portable auto-updater
const portableFile = releaseFiles.find((f) => f.includes("Portable"));
const nsisFile = releaseFiles.find(
  (f) => f.endsWith(".exe") && !f.includes("Portable")
);

if (portableFile) {
  const filePath = path.join(cloudflareDir, portableFile);
  const fileBuffer = fs.readFileSync(filePath);
  const sha512 = crypto
    .createHash("sha512")
    .update(fileBuffer)
    .digest("base64");
  const size = fileBuffer.length;

  const latestJson = {
    version: version,
    files: [
      {
        url: portableFile,
        sha512: sha512,
        size: size,
      },
    ],
    path: portableFile,
    sha512: sha512,
    releaseDate: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(cloudflareDir, "latest.json"),
    JSON.stringify(latestJson, null, 2)
  );
  console.log("✅ Generated latest.json for portable updates");
}

if (nsisFile) {
  const filePath = path.join(cloudflareDir, nsisFile);
  const fileBuffer = fs.readFileSync(filePath);
  const sha512 = crypto
    .createHash("sha512")
    .update(fileBuffer)
    .digest("base64");
  const size = fileBuffer.length;

  const appUpdateJson = {
    version: version,
    files: [
      {
        url: nsisFile,
        sha512: sha512,
        size: size,
      },
    ],
    path: nsisFile,
    sha512: sha512,
    releaseDate: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(cloudflareDir, "app-update.json"),
    JSON.stringify(appUpdateJson, null, 2)
  );
  console.log("✅ Generated app-update.json for NSIS updates");
}

// Create index.html for manual downloads
const indexHtml = `<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pulse - Downloads</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.2em;
        }
        .content {
            padding: 40px;
        }
        .download { 
            margin: 30px 0; 
            padding: 25px; 
            border: 2px solid #e1e5e9; 
            border-radius: 8px; 
            transition: all 0.3s ease;
            background: #f8f9fa;
        }
        .download:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.1);
        }
        .download h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 1.3em;
        }
        .download p {
            margin: 0 0 15px 0;
            color: #6c757d;
            line-height: 1.5;
        }
        .download a { 
            display: inline-block;
            color: #667eea; 
            text-decoration: none; 
            font-weight: 600;
            padding: 12px 24px;
            border: 2px solid #667eea;
            border-radius: 6px;
            transition: all 0.3s ease;
        }
        .download a:hover { 
            background: #667eea;
            color: white;
            transform: translateY(-1px);
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 40px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e1e5e9;
        }
        .version {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pulse</h1>
            <p>Supplier Reminder Pro <span class="version">v${version}</span></p>
        </div>
        
        <div class="content">
            <p style="text-align: center; color: #6c757d; margin-bottom: 30px;">
                Velg nedlastingsformat som passer best for din organisasjon:
            </p>
            
            <div class="download">
                <h3>📦 Portable Version</h3>
                <p>Kjør direkte uten installasjon - anbefalt for testing og enkle installasjoner. Ingen administratorrettigheter nødvendig.</p>
                <a href="${portableFile}">Last ned Portable (.exe)</a>
            </div>
            
            <div class="download">
                <h3>🔧 NSIS Installer</h3>
                <p>Full installasjon med automatiske oppdateringer. Anbefalt for produksjonsmiljøer. Installerer til brukerens AppData-mappe.</p>
                <a href="${nsisFile}">Last ned Installer (.exe)</a>
            </div>
            
            <div class="download">
                <h3>📁 ZIP Archive</h3>
                <p>Arkiv med alle filer for manuell distribusjon eller backup. Inkluderer alle nødvendige komponenter.</p>
                <a href="${releaseFiles.find((f) =>
                  f.endsWith(".zip")
                )}">Last ned ZIP</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Automatiske oppdateringer:</strong> https://suppliers.pages.dev/</p>
            <p><small>Levert av Cloudflare Pages • Rask og pålitelig distribusjon</small></p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(cloudflareDir, "index.html"), indexHtml);
console.log("✅ Generated index.html for manual downloads");

// Create _redirects file for Cloudflare Pages
const redirectsContent = `# Cloudflare Pages redirects
# Serve JSON files with correct content type
/latest.json /latest.json 200
/app-update.json /app-update.json 200

# Redirect root to index.html
/ /index.html 200
`;

fs.writeFileSync(path.join(cloudflareDir, "_redirects"), redirectsContent);
console.log("✅ Generated _redirects for Cloudflare Pages");

console.log("\n🎉 Cloudflare Pages deployment ready!");
console.log("📝 Next steps:");
console.log("1. Commit and push the docs/updates/ directory");
console.log("2. Connect your GitHub repo to Cloudflare Pages");
console.log("3. Set build command to: npm run deploy:cloudflare");
console.log("4. Set build output directory to: docs/updates");
console.log("5. Update auto-updater to use: https://suppliers-anx.pages.dev/");
