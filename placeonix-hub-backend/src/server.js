require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { initJobs } = require('./services/cronService');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info('============================================');
      logger.info(`  Placeonix API running on port ${PORT}`);
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`  API: http://localhost:${PORT}/api/v1`);
      logger.info(`  Health: http://localhost:${PORT}/health`);
      logger.info('============================================');
    });

    // Start cron jobs
    initJobs();

    // Unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...');
      logger.error(err.stack || err);
      server.close(() => process.exit(1));
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Closing server gracefully...`);
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
      // Force shutdown after 10s if still hanging
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(`Server startup failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();
