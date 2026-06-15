const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error('✗ MONGO_URI is not set.');
    logger.error('  → Create placeonix-hub-backend/.env (copy from .env.example) and set MONGO_URI.');
    logger.error('    Local MongoDB:  mongodb://localhost:27017/placeonix-hub');
    logger.error('    MongoDB Atlas:  mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/placeonix-hub');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 8000, // fail fast with a clear message
    });

    logger.info(`✓ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (err) {
    logger.error(`✗ Could not connect to MongoDB: ${err.message}`);
    logger.error('  Most likely MongoDB is not running / not reachable. Fix one of:');
    logger.error('  1) Start a local MongoDB (mongod) so mongodb://localhost:27017 works, OR');
    logger.error('  2) Set MONGO_URI in .env to a MongoDB Atlas connection string (free tier).');
    logger.error(`  Current MONGO_URI host: ${(uri.split('@')[1] || uri).split('/')[0]}`);
    process.exit(1);
  }
};

module.exports = connectDB;
