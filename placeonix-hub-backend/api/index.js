// Vercel serverless entrypoint for the Placeonix API.
// Unlike src/server.js (which calls app.listen for local dev), this exports a
// request handler and lazily opens a cached MongoDB connection per cold start.
const mongoose = require('mongoose');
const app = require('../src/app');

let connPromise = null;
async function ensureDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  if (!connPromise) {
    connPromise = mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
    });
  }
  await connPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDB();
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, message: 'Database connection failed: ' + err.message }));
  }
  return app(req, res);
};
