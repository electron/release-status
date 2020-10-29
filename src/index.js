const express = require("express");
const exphbs = require("express-handlebars");
const Handlebars = require('handlebars');
const fetch = require("node-fetch");
const path = require("path");
const semver = require('semver');

const app = express();

let releases = {
  lastFetch: 0,
  data: null,
};

const getReleasesOrUpdate = async () => {
  if (Date.now() - releases.lastFetch > 60 * 1000) {
    const response = await fetch.default(
      "https://electronjs.org/headers/index.json"
    );
    releases = {
      lastFetch: Date.now(),
      data: await response.json(),
    };
  }
  return releases.data;
};

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "views"));

if (process.env.NODE_ENV === "production") {
  app.enable("view cache");
}

app.get("/releases.json", (req, res) => {
  getReleasesOrUpdate()
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: true }));
});

Handlebars.registerHelper("timeSince", function(str) {
  const d = new Date();
  const today = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const parts = str.split('-').map(n => parseInt(n, 10));
  const releaseDate = new Date(parts[0], parts[1], parts[2]);
  const daysAgo = Math.floor((today.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
});

app.get("/", (req, res) =>
  getReleasesOrUpdate()
    .then((releases) => {
      releases.sort((a, b) => semver.compare(b.version, a.version));
      const lastNightly = releases.find(r => semver.parse(r.version).prerelease[0] === 'nightly');
      const lastBeta = releases.find(r => semver.parse(r.version).prerelease[0] === 'beta');
      const betaMajor = semver.parse(lastBeta.version).major;
      const latestSupported = [betaMajor - 1, betaMajor - 2, betaMajor - 3].map(major => releases.find(r => semver.parse(r.version).major === major));
      res.render("home", {
        releases,
        lastNightly,
        lastBeta,
        latestSupported,
        css: 'home',
      })
    })
    .catch(() => res.status(500).json({ error: true }))
);
app.get("/history", (req, res) =>
  res.render("history", {
    css: "history",
  })
);

app.use(
  express.static(path.resolve(__dirname, "static"), {
    fallthrough: true,
  })
);

app.use((req, res) => {
  res.redirect("/");
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Electron release history listening");
});
