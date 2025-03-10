// utils/db.js
const { MongoClient } = require('mongodb');

const uri =
  'mongodb+srv://ajinkyanikam464:TXXWDrUTcXHvu9VD@cluster0.flhc2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

async function connect() {
  if (!db) {
    await client.connect();
    db = client.db('user');
  }
  return db;
}

module.exports = { connect };
