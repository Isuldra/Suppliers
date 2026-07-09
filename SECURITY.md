# Security Policy

## Supported Versions

We actively support the following versions of Pulse (OneMed SupplyChain):

| Version | Supported |
| ------- | --------- |
| 1.5.x   | Yes       |
| < 1.5   | No        |

## Security Best Practices

### Dependency Management

This project follows OWASP best practices for dependency management:

1. **Regular Security Audits**: Run `bun run security-check` weekly
2. **Automated Updates**: Use `bun update` for compatible updates
3. **Monitoring**: GitHub Actions automatically audit dependencies

### Security Commands

```bash
# Run comprehensive security check
bun run security-check

# Quick security audit
bun run security-audit

# Fix compatible vulnerabilities
bun update

# Check for outdated packages
bunx npm-check-updates
```

### Reporting Vulnerabilities

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [security@onemed.no]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Critical**: 24 hours
- **High**: 72 hours
- **Medium**: 1 week
- **Low**: 2 weeks

### Security Features

- Automatic dependency auditing
- Content Security Policy (CSP)
- Secure email handling
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Development Security

When contributing:

1. Run `bun run security-check` before submitting PRs
2. Ensure no new vulnerabilities are introduced
3. Follow secure coding practices
4. Test security fixes thoroughly

### Dependencies

We use the following security tools:

- `bun audit` - Vulnerability scanning
- `npm-check-updates` - Dependency updates
- GitHub Actions (`.github/workflows/security-audit.yml`) - Automated security checks
- `scripts/security-check.js` - Comprehensive auditing

## Changelog

Security-relevant changes are not tracked separately from the rest of the project. See
[`docs/CHANGELOG.md`](docs/CHANGELOG.md) for the full release history. No security incidents or
fixes have been recorded in this document since it was created.

---

_This security policy is based on OWASP guidelines and industry best practices._
