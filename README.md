# releases.electronjs.org

This repository contains code for https://releases.electronjs.org, which provides release status information for
the [Electron](https://github.com/electron/electron) project.

## Getting started

The website is a simple Node.js app built using [Express](https://expressjs.com/) and [Handlebars.js](https://handlebarsjs.com/).

### Installation

To run the app locally, install dependencies and run the `start` script:

```
yarn
yarn start
```

When developing locally, you may want to use the `watch` script instead, which watches for file changes using [nodemon](https://github.com/remy/nodemon).

### GitHub Authentication

GitHub limits how many API requests you can make without logging in. If you're running the app locally and it fetches a lot of GitHub data (like release history), you might hit that limit.

To avoid this, create a GitHub Personal Access Token (PAT) and set it in your environment like this:
##On Windows (PowerShell):
#  $env:GITHUB_TOKEN="your_token_here"
This gives the app permission to make more API requests without getting blocked.

## License

Distributed under the [MIT License](https://github.com/electron/release-status/blob/main/LICENSE).
