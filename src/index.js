const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');

const a = require('./utils/a');
const { getReleasesOrUpdate, getActiveReleasesOrUpdate } = require('./data');

const app = express();

const hbs = exphbs.create({
  helpers: {
    formatDate: (date) => new Date(date).toLocaleDateString(),
    ifEquals: function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    }
  },
  defaultLayout: 'main',
  layoutsDir: path.resolve(__dirname, 'views/layouts'),
  partialsDir: path.resolve(__dirname, 'views/partials')
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.resolve(__dirname, 'views'));

app.use('/releases.json', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  });
  app.enable('view cache');
}

app.get(
  '/releases.json',
  a(async (req, res) => {
    res.json(await getReleasesOrUpdate());
  }),
);

app.get(
  '/active.json',
  a(async (req, res) => {
    res.json(await getActiveReleasesOrUpdate());
  }),
);

app.use(express.static(path.resolve(__dirname, 'static'), {
  fallthrough: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

app.use('/', require('./routes/home'));
app.use('/release', require('./routes/release'));
app.use('/releases', require('./routes/releases'));
app.use('/history', require('./routes/history'));
app.use('/release-build', require('./routes/release-build'));
app.use('/pr', require('./routes/pr'));
app.use('/pr-lookup', require('./routes/pr-lookup'));
app.use('/chromium', require('./routes/chromium'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

app.use((req, res) => {
  res.status(404).redirect('/');
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Electron release history listening on http://localhost:${server.address().port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});