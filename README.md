# Vietnamese Source for Paperback 0.8

> A premium source toolkit for Vietnamese manga websites, built for Paperback 0.8 with modular architecture, maintainable parsing logic, and multi-source extensibility.

[![Build Verified](https://img.shields.io/badge/build-verified-success)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Paperback 0.8](https://img.shields.io/badge/Paperback-0.8-orange)](https://www.readpaperback.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

## Overview

This repository is a professional source package for Paperback 0.8, created to support Vietnamese manga websites beyond a single provider. It is designed as a reusable foundation for building, maintaining, and expanding source modules for multiple publishers and domains.

The project emphasizes:

- clean separation of source logic and HTML parsing
- support for multiple Vietnamese source providers
- dynamic domain configuration
- maintainable request and parser architecture
- rapid adaptation to site structure changes

## Why this project

Many source projects are built around a single website and become difficult to scale. This repository follows a more robust pattern:

- one source implementation can be reused as a template
- parsing logic can be adapted per publisher
- domain settings are configurable without code rewrites
- the structure is ready for future Vietnamese source additions

## Core Features

- Search and tag discovery
- Homepage section generation
- Featured, hot, and recently updated content
- Manga detail fetching
- Chapter list extraction
- Chapter page parsing and image loading
- Custom source settings and domain switching
- Request interceptors and header management
- Cloudflare error handling support

## Tech Stack

- TypeScript
- Paperback 0.8 toolchain
- Cheerio for HTML parsing
- Paperback source runtime APIs
- Modular source architecture

## Repository Structure

```text
Extensions-Viet-0.8/
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
├── mockup.html
├── bundles/
│   └── index.html
├── src/
│   └── NhatTruyen/
│       ├── NhatTruyen.ts
│       ├── NhatTruyenParser.ts
│       ├── NhatTruyenSetting.ts
│       └── includes/
│           └── icon.png
├── tmp/
│   └── generated build artifacts
└── extensible structure for additional Vietnamese sources
```

## Supported Use Cases

This project is suitable for:

- building a new Paperback source from a Vietnamese publisher
- adapting an existing source when the site layout changes
- managing multiple websites using a single source architecture pattern
- testing domain changes without rewriting the source logic

## Requirements

- Node.js 18+
- npm
- Paperback development environment

## Quick Start

Install dependencies:

```bash
npm install
```

Run the local Paperback source server:

```bash
npm run serve
```

Build the extension bundle:

```bash
npm run bundle
```

## Source Architecture

### 1. Main source entry

The core source implementation is defined in `src/NhatTruyen/NhatTruyen.ts` and handles:

- source metadata
- request manager setup
- source menu configuration
- homepage data integration
- search, manga details, and chapter collection

### 2. Parser layer

The parser logic is defined in `src/NhatTruyen/NhatTruyenParser.ts`. This is the main file used to adapt the source to the exact HTML structure of a site.

### 3. Settings and domain management

Domain configuration and source settings are handled in `src/NhatTruyen/NhatTruyenSetting.ts`, including:

- custom base URL selection
- domain reset
- connection testing
- UI-based configuration for source behavior

## Common Maintenance Points

When a source website changes, the most common places to inspect are:

1. Search route patterns in `src/NhatTruyen/NhatTruyen.ts`
2. Image selectors in `src/NhatTruyen/NhatTruyenParser.ts`
3. Chapter list parsing in `src/NhatTruyen/NhatTruyenParser.ts`
4. Homepage section extraction in `src/NhatTruyen/NhatTruyenParser.ts`
5. Domain handling in `src/NhatTruyen/NhatTruyenSetting.ts`

## Troubleshooting

### Blank chapter images

If chapter pages are loading but images are missing, inspect the parser selectors responsible for chapter image extraction.

### Search returns no results

Verify the request URL and the result selectors. If the site moves to a new query format, update the source logic accordingly.

### Domain-related failures

If a site changes hostnames or redirect patterns, update the source settings to the correct base domain.

### Cloudflare and blocked requests

If the source encounters Cloudflare or 403/429 responses, validate request headers and the configured URL before changing the parser logic.

## Verified Build Status

This project was successfully verified with:

```bash
npx paperback bundle
```

The command completed successfully, confirming the current source bundle can be generated in this environment.

## Roadmap

- Expand the source architecture to additional Vietnamese publishers
- Improve modular reusable source templates
- Add stronger domain fallback logic
- Refine parser resilience for frequent website changes

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Maintainer

- Author: Lê Đại Thiện Nhân
- Project: Vietnamese Extensions (0.8)
- Focus: multi-source Vietnamese Paperback development

## Closing Note

This repository is built as a scalable Vietnamese source foundation for Paperback 0.8, not limited to a single provider. Its architecture is designed to evolve with the ecosystem, support multiple websites, and remain easy to extend as the target publishers change over time.
