# AirEye

**Prompt-based document image workflow for structured output generation.**

## Overview

AirEye is a mobile-first application that converts inconsistent document images into structured, reusable outputs. Users capture or upload a document image, describe the desired output format with a prompt, and AirEye processes it into a consistent result — ready for review and export.

## Why AirEye

Manual reformatting of document images is slow and error-prone. AirEye reduces repetitive formatting work by letting users define their output format once and apply it consistently across multiple documents.

## Core Workflow

1. **Capture or upload** a document image
2. **Define** the desired output format using a prompt
3. **Process** the image content
4. **Normalize** the extracted content
5. **Generate** a consistent structured result
6. **Review and export** the output

## Example Use Cases

- Standardized document intake for internal workflows
- Receipt processing and expense normalization
- Form extraction and structured data conversion
- Mobile-first document operations in the field

## Architecture

```
mobile/     — Flutter mobile application (iOS, Android)
backend/    — Express/TypeScript API server
docs/       — Project documentation
scripts/    — Utility scripts
```

See `backend/README.md` and `docs/` for detailed architecture and API documentation.

## Responsible Use

AirEye is designed only for user-submitted document workflows with explicit user action and consent.

This application must not be used for:
- Hidden capture or background surveillance
- Unauthorized data collection
- Credential theft or permission bypassing
- Anti-detection behavior

## Roadmap

AirEye aims to reduce repetitive manual formatting work. Future scenarios may include:

- Standardized document intake pipelines
- Receipt processing and normalization
- Form field extraction and structured output generation
- Internal workflow automation
- Mobile-first document operations

### AirEye-Cluster

[AirEye-Cluster](https://github.com/lowjungxuandev/AirEye-Cluster) is the GitOps Kubernetes deployment repository for running the AirEye backend and supporting platform services.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Security

See [SECURITY.md](SECURITY.md) for our security policy and vulnerability disclosure process.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
