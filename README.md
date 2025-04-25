# releases.electronjs.org

This repository contains code for https://releases.electronjs.org, which provides release status information for
the [Electron](https://github.com/electron/electron) project.

## Getting started

The website is built using [Remix](https://remix.run/).

### Installation

To run the app locally, install dependencies and run the `dev` script:

```
npm install
npm run dev
```

### GitHub Authentication

The app pulls release information from GitHub, and local usage (especially going through pages of past releases) may hit the rate limit for anonymous GitHub usage. You can provide a GitHub Personal Access Token (PAT) by setting the `GITHUB_TOKEN` environment variable before running the app locally, which will have higher rate limits.

## License

Distributed under the [MIT License](https://github.com/electron/release-status/blob/main/LICENSE).