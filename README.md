# Vietnamese Source for Paperback 0.8

This project provides a Paperback 0.8 source for reading manga from NhatTruyen. It includes core features such as homepage sections, search, chapter listing, and custom domain configuration for sites that frequently change domains.

## Features

- Search and tag browsing
- Homepage sections for featured, hot, and new updates
- Manga details and chapter list fetching
- Chapter image extraction and page parsing
- Built-in domain configuration for dynamic site URLs
- Cloudflare-related error handling support

## Project structure

```text
Extensions-Viet-0.8/
├── README.md
├── package.json
├── tsconfig.json
├── bundles/
│   └── index.html
├── src/
│   └── NhatTruyen/
│       ├── NhatTruyen.ts
│       ├── NhatTruyenParser.ts
│       ├── NhatTruyenSetting.ts
│       └── includes/
│           └── icon.png
└── tmp/
    └── generated build artifacts
```

## Requirements

- Node.js 18+
- npm
- Paperback toolchain

## Installation

```bash
npm install
```

## Run locally

```bash
npm run serve
```

This starts the local Paperback source server. Add the repository URL provided by the tool to Paperback to test the extension in the app.

## Build bundle

```bash
npm run bundle
```

This generates the packaged source output under the `bundles/` directory for deployment or hosting.

## Notes for customization

The source is designed to be adapted to the actual HTML structure of the target site. If the website changes its markup or URL patterns, the most common places to update are:

1. Search URL logic in `src/NhatTruyen/NhatTruyen.ts`
2. Chapter image selectors in `src/NhatTruyen/NhatTruyenParser.ts`
3. Chapter list parsing in `src/NhatTruyen/NhatTruyenParser.ts`
4. Homepage sections and section item extraction in the same parser file

## Troubleshooting

- If manga details load but chapter images are blank, review `parseChapterDetails` and the image selectors.
- If search returns no results, verify the search URL and result selector logic.
- If requests fail due to domain changes, update the source settings from the extension menu.
- If the site returns Cloudflare errors, confirm the domain and request headers are valid.

## Development workflow

Use the source menu inside Paperback to change the base domain when the upstream site updates its host name. For structural changes in the site, inspect the page HTML and adjust the corresponding parser selectors.

## License

This project is licensed under the MIT License.

## Maintainer

- Author: Lê Đại Thiện Nhân
- Repository: Vietnamese Extensions (0.8)
