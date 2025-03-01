# releases.electronjs.org

[releases.electronjs.org](https://releases.electronjs.org) is a website that provides real-time status information for all official Electron releases. Electron itself is a framework  [Electron](https://github.com/electron/electron) that lets developers build cross-platform desktop apps using web technologies (like HTML, CSS, and JavaScript)

## Getting started 

The website is built using Node.js + Express (backend) and Handlebars (templating for HTML).

It fetches release data directly from the official Electron GitHub repository using GitHub’s API.

It displays this data in a nice, human-readable format on https://releases.electronjs.org.

### Installation

To run the app locally, install dependencies and run the `start` script:

```
yarn
yarn start
```

When developing locally, you may want to use the `watch` script instead, which watches for file changes using [nodemon](https://github.com/remy/nodemon). 


## How It Works
  
When a request hits the site, the app makes API calls to  https://api.github.com/repos/electron/electron/releases.

It processes the response and renders a release dashboard using Handlebars templates

This data includes version numbers, release dates, changelogs, and publishing statuses for different platforms

The result is a simple, developer-friendly dashboard showing everything related to Electron releases.



### GitHub Authentication

The app pulls release information from GitHub, and local usage (especially going through pages of past releases) may hit the rate limit for anonymous GitHub usage. You can provide a GitHub Personal Access Token (PAT) by setting the `GITHUB_TOKEN` environment variable before running the app locally, which will have higher rate limits.

Create a .env file in the root directory and add

GITHUB_TOKEN=your_personal_access_token_here

## License

Distributed under the [MIT License](https://github.com/electron/release-status/blob/main/LICENSE).
