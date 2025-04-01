const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { connect } = require('./utils/db');
const { ObjectId } = require('mongodb');

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

app.get('/api/events', async (req, res) => {
  // Get eventd from request parameters
  try {
    const db = await connect();
    const eventsCollection = db.collection('events');

    // Find events with the specific eventd
    const events = await eventsCollection.find({}).toArray();
    console.log('logging the events', events);

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events!', error });
  }
});

app.delete('/api/events/delete/:id', async (req, res) => {
  const { id } = req.params; // Get the event ID from the request parameters
  console.log('logging the objectid', new ObjectId(id));
  try {
    const db = await connect();
    const eventsCollection = db.collection('events');

    // Delete the event with the specified ID
    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) }); //new require('mongodb').ObjectId(id)

    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'Event deleted successfully!' });
    } else {
      res.status(404).json({ message: 'Event not found!' });
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Error deleting event!', error });
  }
});

app.put('/api/events/update/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required!' });
  }

  try {
    const db = await connect();
    const eventsCollection = db.collection('events');

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, description } },
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Event updated successfully!' });
    } else {
      res.status(404).json({ message: 'Event not found!' });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Error updating event!', error });
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
