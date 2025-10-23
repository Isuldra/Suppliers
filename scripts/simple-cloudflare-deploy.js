import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
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

console.log(`🚀 Setting up Cloudflare Pages for version ${version}...`);

// Create a simple index.html for testing
const indexHtml = `<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OneMed SupplyChain - Downloads</title>
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
        .status {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .status h3 {
            color: #2e7d32;
            margin: 0 0 10px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 40px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e1e5e9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneMed SupplyChain</h1>
            <p>Supplier Reminder Pro <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.9em;">v${version}</span></p>
        </div>
        
        <div class="content">
            <div class="status">
                <h3>✅ Cloudflare Pages er konfigurert!</h3>
                <p>Automatiske oppdateringer er nå tilgjengelige via Cloudflare Pages.</p>
            </div>
            
            <p style="text-align: center; color: #6c757d;">
                Oppdateringsfiler vil bli generert automatisk når du lager en ny release.
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Update URL:</strong> https://suppliers-anx.pages.dev/</p>
            <p><small>Levert av Cloudflare Pages • Rask og pålitelig distribusjon</small></p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(cloudflareDir, "index.html"), indexHtml);
console.log("✅ Generated index.html");

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

console.log("\n🎉 Cloudflare Pages setup complete!");
console.log("📝 Your site should now be available at: https://suppliers-anx.pages.dev/");
console.log("📝 Update files will be generated automatically when you create releases.");
