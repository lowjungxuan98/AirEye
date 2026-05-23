# Security Policy

## Scope

AirEye handles document images submitted by users. This policy covers:

- **Document image handling**: Upload, storage, processing, and deletion of
  user-submitted document images
- **Authentication**: User identity verification and session management
- **API exposure**: Backend API endpoints and their access controls
- **Storage**: Object storage (S3/MinIO), realtime database (Firebase RTDB),
  and any cached or temporary data
- **Secret handling**: API keys, service account credentials, signing keys,
  and other sensitive configuration

## Responsible Use

AirEye is designed for user-submitted document workflows with explicit user
action and consent. It must not be used for hidden capture, background
surveillance, unauthorized data collection, credential theft, or permission
bypassing.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

If you discover a security vulnerability, please report it privately via
GitHub's [Security Advisories](https://github.com/lowjungxuandev/AirEye/security/advisories/new)
feature.

Include in your report:
- A description of the issue
- Steps to reproduce
- Affected versions or components
- Any suggested mitigations

You should receive an acknowledgment within 48 hours. We aim to provide an
initial assessment within 5 business days.

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| latest  | :white_check_mark: |

Only the latest release on `main` receives security updates.

## Security Best Practices for Deployments

When deploying AirEye, ensure:
- All secrets are injected via environment variables or a secrets manager,
  never committed to the repository
- API endpoints are served over HTTPS
- Firebase security rules are configured to restrict access appropriately
- S3/MinIO buckets are not publicly accessible
- Service account credentials follow the principle of least privilege
