# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the severity of the vulnerability.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Pickle Play seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do

- **Report security vulnerabilities privately** via GitHub's Security Advisory feature:
  1. Go to the [Security tab](https://github.com/pickle-play/pickle-play/security)
  2. Click "Report a vulnerability"
  3. Fill out the form with as much detail as possible

- **Include the following information** (as much as you can provide):
  - Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting)
  - Full paths of source file(s) related to the issue
  - Location of the affected source code (tag/branch/commit or direct URL)
  - Step-by-step instructions to reproduce the issue
  - Proof-of-concept or exploit code (if possible)
  - Impact of the issue, including how an attacker might exploit it

### Please Do Not

- **Do not** open a public GitHub issue for security vulnerabilities
- **Do not** disclose the vulnerability publicly until we have had a chance to address it
- **Do not** exploit the vulnerability beyond what is necessary to demonstrate it

## Response Timeline

- **Initial Response**: Within 48 hours, we will acknowledge receipt of your report
- **Status Update**: Within 7 days, we will provide an initial assessment
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

## Security Measures

Pickle Play implements the following security measures:

### Authentication & Authorization
- Secure session management with HTTP-only cookies
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints
- Password hashing with bcrypt/argon2

### Data Protection
- All data encrypted in transit (TLS 1.3)
- Sensitive data encrypted at rest
- Input validation and sanitization
- SQL injection prevention via parameterized queries

### Infrastructure
- Regular security updates and patching
- Web Application Firewall (WAF)
- DDoS protection
- Security headers (CSP, HSTS, etc.)

### Monitoring
- Security event logging
- Intrusion detection
- Regular security audits
- Automated vulnerability scanning

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we deeply appreciate security researchers who help us keep Pickle Play secure. We will acknowledge your contribution in our release notes (unless you prefer to remain anonymous).

## Contact

For security concerns, please use GitHub's Security Advisory feature or contact:
- Email: security@pickle-play.com (for urgent matters only)

Thank you for helping keep Pickle Play and our users safe!
