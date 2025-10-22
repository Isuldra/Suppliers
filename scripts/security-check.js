#!/usr/bin/env node

/**
 * Security Check Script
 * Based on OWASP best practices for dependency management
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class SecurityChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, "package.json");
    this.packageLockPath = path.join(this.projectRoot, "package-lock.json");
  }

  /**
   * Run comprehensive security check
   */
  async runSecurityCheck() {
    console.log("🔒 Starting Security Audit...\n");

    try {
      // 1. Check if package files exist
      this.checkPackageFiles();

      // 2. Run npm audit
      await this.runNpmAudit();

      // 3. Check for outdated packages
      await this.checkOutdatedPackages();

      // 4. Generate security report
      this.generateSecurityReport();

      console.log("✅ Security check completed successfully!\n");
    } catch (error) {
      console.error("❌ Security check failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * Verify package files exist
   */
  checkPackageFiles() {
    console.log("📋 Checking package files...");

    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error("package.json not found");
    }

    if (!fs.existsSync(this.packageLockPath)) {
      console.log("⚠️  package-lock.json not found. Running npm install...");
      execSync("npm install", { stdio: "inherit" });
    }

    console.log("✅ Package files verified\n");
  }

  /**
   * Run npm audit with different severity levels
   */
  async runNpmAudit() {
    console.log("🔍 Running npm audit...");

    try {
      // Run audit with moderate level threshold
      execSync("npm audit --audit-level=moderate", { stdio: "inherit" });
      console.log("✅ No moderate or high severity vulnerabilities found\n");
    } catch (error) {
      if (error.status === 1) {
        console.log("⚠️  Vulnerabilities found. Running detailed audit...");

        try {
          // Get detailed audit report
          const auditOutput = execSync("npm audit --json", {
            encoding: "utf8",
          });
          const auditReport = JSON.parse(auditOutput);

          this.processAuditResults(auditReport);
        } catch (auditError) {
          console.error("❌ Failed to get detailed audit report");
          throw auditError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Process and display audit results
   */
  processAuditResults(auditReport) {
    const vulnerabilities = auditReport.vulnerabilities || {};
    const vulnCount = Object.keys(vulnerabilities).length;

    console.log(`📊 Found ${vulnCount} vulnerabilities:\n`);

    Object.entries(vulnerabilities).forEach(([packageName, vuln]) => {
      console.log(`🔴 ${packageName} (${vuln.severity})`);
      console.log(`   Path: ${vuln.via}`);
      console.log(`   Fix: npm audit fix\n`);
    });

    // Suggest fixes
    console.log("💡 Suggested actions:");
    console.log("   1. Run: npm audit fix");
    console.log("   2. For major updates: npm audit fix --force");
    console.log("   3. For specific packages: npm update <package-name>\n");
  }

  /**
   * Check for outdated packages
   */
  async checkOutdatedPackages() {
    console.log("📦 Checking for outdated packages...");

    try {
      // Check if npm-check-updates is available
      execSync("npx npm-check-updates --version", { stdio: "pipe" });

      // Run ncu to check for updates
      execSync("npx npm-check-updates --format group", { stdio: "inherit" });
    } catch (error) {
      console.log(
        "ℹ️  npm-check-updates not available. Skipping outdated check."
      );
      console.log("   Install with: npm install -g npm-check-updates\n");
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    const reportPath = path.join(this.projectRoot, "security-report.json");

    try {
      const auditOutput = execSync("npm audit --json", { encoding: "utf8" });
      const auditReport = JSON.parse(auditOutput);

      const report = {
        timestamp: new Date().toISOString(),
        project: require(this.packageJsonPath).name,
        version: require(this.packageJsonPath).version,
        vulnerabilities: auditReport.vulnerabilities || {},
        summary: {
          total: Object.keys(auditReport.vulnerabilities || {}).length,
          critical: this.countBySeverity(
            auditReport.vulnerabilities || {},
            "critical"
          ),
          high: this.countBySeverity(auditReport.vulnerabilities || {}, "high"),
          moderate: this.countBySeverity(
            auditReport.vulnerabilities || {},
            "moderate"
          ),
          low: this.countBySeverity(auditReport.vulnerabilities || {}, "low"),
        },
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Security report saved to: ${reportPath}\n`);
    } catch (error) {
      console.log("⚠️  Could not generate security report");
    }
  }

  /**
   * Count vulnerabilities by severity
   */
  countBySeverity(vulnerabilities, severity) {
    return Object.values(vulnerabilities).filter(
      (vuln) => vuln.severity === severity
    ).length;
  }
}

// Run security check if called directly
if (require.main === module) {
  const checker = new SecurityChecker();
  checker.runSecurityCheck().catch(console.error);
}

module.exports = SecurityChecker;
