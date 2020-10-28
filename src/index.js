const express = require('express');
const exphbs  = require('express-handlebars');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

let releases = {
  lastFetch: 0,
  data: null,
};

const getReleasesOrUpdate = async () => {
  if (Date.now() - releases.lastFetch > 60 * 1000) {
    const response = await fetch.default('https://electronjs.org/headers/index.json');
    releases = {
      lastFetch: Date.now(),
      data: await response.json(),
    }
  }
  return releases.data;
}

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', path.resolve(__dirname, 'views'));

if (process.env.NODE_ENV === 'production') {
  app.enable('view cache');
}

app.get('/releases.json', (req, res) => {
  getReleasesOrUpdate().then((data) => res.json(data)).catch((err) => res.status(500).json({ error: true }));
});

app.get('/', (req, res) => res.render('home'));
app.get('/history', (req, res) => res.render('history'));

app.use(express.static(path.resolve(__dirname, 'static'), {
  fallthrough: true,
}));

app.use((req, res) => {
  res.redirect('/');
});

app.listen(process.env.PORT || 8080, () => {
  console.log('Electron release history listening');
});
