const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { connect } = require('./utils/db');

const a = require('./utils/a');
const { getReleasesOrUpdate, getActiveReleasesOrUpdate } = require('./data');

const app = express();

app.use(express.json());
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', path.resolve(__dirname, 'views'));

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(await getReleasesOrUpdate());
  }),
);

app.get(
  '/active.json',
  a(async (req, res) => {
    res.json(await getActiveReleasesOrUpdate());
  }),
);

app.post('/api/events', async (req, res) => {
  const { title, description, eventd } = req.body;
  try {
    const db = await connect();
    const eventsCollection = db.collection('events');
    const result = await eventsCollection.insertOne({ title, description, eventd });
    res.status(201).json({ message: 'Event added successfully!', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Error adding event!', error });
  }
});

app.get('/api/events/:eventd', async (req, res) => {
  const { eventd } = req.params; // Get eventd from request parameters
  try {
    const db = await connect();
    const eventsCollection = db.collection('events');

    // Find events with the specific eventd
    const events = await eventsCollection.find({ eventd }).toArray();

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events!', error });
  }
});

app.use('/newreleases', require('./routes/newreleases'));
app.use('/', require('./routes/home'));
app.use('/release', require('./routes/release'));
app.use('/releases', require('./routes/releases'));
app.use('/history', require('./routes/history'));
app.use('/release-build', require('./routes/release-build'));
app.use('/pr', require('./routes/pr'));
app.use('/pr-lookup', require('./routes/pr-lookup'));

app.use(
  express.static(path.resolve(__dirname, 'static'), {
    fallthrough: true,
  }),
);

app.use((req, res) => {
  res.redirect('/');
});

const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Electron release history listening', `http://localhost:${server.address().port}`);
});
