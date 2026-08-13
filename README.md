# Vietnamese Paperback Sources Collection

> Multi-source extension pack for Paperback 0.8, built to support a wide range of Vietnamese manga and comic websites through a modular, reusable source architecture.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Paperback 0.8](https://img.shields.io/badge/Paperback-0.8-orange)](https://www.readpaperback.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

## Overview

This repository brings together multiple source modules for Vietnamese comic platforms under a single, maintainable Paperback 0.8 project. Instead of focusing on one website, it is designed as a reusable source library where each provider has its own parser, settings, and integration entry points while sharing the same overall architecture.

The goal is simple: provide a scalable foundation for reading, scraping, and adapting Vietnamese comic sources with cleaner structure and easier long-term maintenance.

## Why this project

Most source projects are limited to a single host and become fragile as the target site changes. This project follows a more flexible approach:

- each source is isolated and independently maintained
- the shared architecture can be reused across new publishers
- parser logic is separated from source configuration
- domains and request behavior can be adapted without rewriting the entire project
- new providers can be added with a consistent pattern

## Core capabilities

- search and lookup across source providers
- homepage and featured content parsing
- manga details and metadata extraction
- chapter list retrieval
- chapter page image extraction
- request and source configuration management
- domain switching and source-specific settings
- modular extension for future website additions

## Supported sources

This repository currently includes implementations for the following sources:

| Source     | Coverage                          | Notes                                      |
| ---------- | --------------------------------- | ------------------------------------------ |
| BuonDua    | Vietnamese comic portal           | General source integration                 |
| CuuTruyen  | Comic reading platform            | Search, catalog, and chapter parsing       |
| FoxTruyen  | Manga/comic content source        | Structured site parsing                    |
| HentaiCube | Adult-themed content              | Specialised source module                  |
| HentaiVN   | Adult and manga content           | Additional parser variant                  |
| HentaiVNX  | Hentai/comic provider             | Domain-driven integration                  |
| HotGirl    | Visual content source             | Source-specific adaptation                 |
| MauLon     | Genre-focused comic source        | Parser-based extraction                    |
| MiMiHentai | Adult content portal              | Site-specific handling                     |
| Misskon    | Vietnamese manga site             | Catalog and detail integration             |
| NetTruyen  | Popular comic platform            | One of the core source modules             |
| NhatTruyen | Vietnamese comic source           | Mature source structure and parser pattern |
| NudeBird   | Specialised source                | Custom integration                         |
| SayHentai  | Hentai content provider           | Parser and URL-specific logic              |
| TComic     | Comic portal                      | Search and chapter support                 |
| TruyenQQ   | Publisher/reader source           | Popular content extraction                 |
| ViHentai   | Hindi/Asian-themed source variant | Source-specific adaptation                 |
| VinaHentai | Hentai-content source             | Maintained as an independent module        |

These modules reflect a broader strategy: one shared project, many source implementations, each adapted to a different website structure and data pattern.

## Project structure

```text
Extensions-Viet-0.8/
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
├── jest.config.js
├── mockup.html
├── bundles/
│   ├── index.html
│   └── <generated source bundles>
├── common/
│   ├── index.ts
│   ├── index.js
│   ├── index.d.ts
│   └── QueryCache.ts
├── src/
│   ├── BuonDua/
│   ├── CuuTruyen/
│   ├── FoxTruyen/
│   ├── HentaiCube/
│   ├── HentaiVN/
│   ├── HentaiVNX/
│   ├── HotGirl/
│   ├── MauLon/
│   ├── MiMiHentai/
│   ├── Misskon/
│   ├── NetTruyen/
│   ├── NhatTruyen/
│   ├── NudeBird/
│   ├── SayHentai/
│   ├── TComic/
│   ├── TruyenQQ/
│   ├── ViHentai/
│   ├── VinaHentai/
│   └── ...
├── tests/
│   ├── CuuTruyenTag.test.ts
│   ├── TComic.test.ts
│   └── TruyenQQ.test.ts
├── tmp/
│   └── generated or temporary build artifacts
└── draft/
    └── experimental sources and archived work
```

## Architecture

Each source generally follows the same layered pattern:

### 1. Source entry file

The main source class defines the provider identity, metadata, request setup, homepage integration, and source behavior.

### 2. Parser layer

The parser handles the site-specific HTML or payload scraping logic. This is typically where selectors, transformations, and extraction rules are implemented.

### 3. Settings module

The settings file manages base URL configuration, domain switching, source preferences, and other source-specific runtime options.

### 4. Shared support modules

Common utilities and data helpers live in the shared folders and are reused across providers.

This separation makes the project easier to maintain when a target website changes its structure or when a new provider needs to be supported.

## Requirements

- Node.js 18+
- npm
- Paperback 0.8 development environment
- TypeScript toolchain and compatible dependencies

## Quick start

Install dependencies:

```bash
npm install
```

Run the local Paperback source preview or dev server:

```bash
npm run serve
```

Build the bundle:

```bash
npm run bundle
```

Run the automated tests:

```bash
npm test
```

Deploy the generated bundle to GitHub Pages:

```bash
npm run deploy
```

## Development workflow

To add or update a source:

1. create or edit the source folder under `src/`
2. implement the main source class and parser logic
3. define settings and domain patterns if needed
4. validate extraction rules against the website structure
5. test the behavior with the source’s existing test setup
6. run the bundle to confirm the project still builds correctly

## Common maintenance points

When a site changes, the most likely issues are in:

- search request formatting
- homepage section selectors
- manga detail parsing
- chapter list extraction
- chapter page image selectors
- domain configuration and redirects

## Notes on compatibility

This project is specifically built around the Paperback 0.8 source framework and follows a source-driven design that is optimized for Vietnamese web comic ecosystems. It is intentionally modular so the same patterns can be reused for newer sources without starting from scratch.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contribution

Contributions are welcome for:

- adding new providers
- improving parser resilience
- fixing extraction issues for existing sources
- documenting source-specific behavior
- refactoring shared code for maintainability

## Final note

This repository is more than a single extension — it is a collection of Vietnamese source implementations sharing the same professional architecture. It is designed to be extensible, maintainable, and practical for long-term Paperback development.
