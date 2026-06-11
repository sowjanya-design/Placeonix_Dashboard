const cron = require('node-cron');
const logger = require('../utils/logger');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Session = require('../models/Session');
const NotificationService = require('../services/notificationService');

/**
 * Centralised cron job registry.
 * Initialise with `initJobs()` from server.js
 */

// Job: Send fee reminders to students with outstanding dues (daily at 10 AM)
const feeReminderJob = () => {
  cron.schedule('0 10 * * *', async () => {
    logger.info('[CRON] Running fee reminder job...');
    try {
      const enrollments = await Enrollment.find({
        'fee.due': { $gt: 0 },
        status: { $in: ['enrolled', 'in_progress'] },
      }).populate('student', '_id firstName');

      let sent = 0;
      for (const e of enrollments) {
        if (!e.student) continue;
        await NotificationService.notifyFeeReminder(e.student._id, e.fee.due);
        sent += 1;
      }
      logger.info(`[CRON] Fee reminders sent: ${sent}`);
    } catch (err) {
      logger.error(`[CRON] Fee reminder failed: ${err.message}`);
    }
  });
};

// Job: Check student attendance and warn if below 75% (daily at 8 PM)
const attendanceWarningJob = () => {
  cron.schedule('0 20 * * *', async () => {
    logger.info('[CRON] Running attendance warning job...');
    try {
      const enrollments = await Enrollment.find({ status: 'in_progress' });
      let warned = 0;

      for (const e of enrollments) {
        const records = await Attendance.find({
          student: e.student,
          batch: e.batch,
        });
        if (records.length < 5) continue; // not enough data yet

        const attended = records.filter((r) => ['present', 'late'].includes(r.status)).length;
        const percentage = Math.round((attended / records.length) * 100);

        if (percentage < 75) {
          await NotificationService.notifyAttendanceWarning(e.student, percentage);
          warned += 1;
        }
      }
      logger.info(`[CRON] Attendance warnings sent: ${warned}`);
    } catch (err) {
      logger.error(`[CRON] Attendance warning failed: ${err.message}`);
    }
  });
};

// Job: Mark overdue assignments (every hour)
const overdueAssignmentJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await Assignment.updateMany(
        { dueDate: { $lt: new Date() }, status: 'published' },
        { status: 'submitted' } // marked closed for new submissions
      );
      if (result.modifiedCount > 0) {
        logger.info(`[CRON] Closed ${result.modifiedCount} overdue assignments`);
      }
    } catch (err) {
      logger.error(`[CRON] Overdue assignment job failed: ${err.message}`);
    }
  });
};

// Job: Update session status — mark live/completed (every 5 minutes)
const sessionStatusJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Mark sessions as live
      await Session.updateMany(
        { startTime: { $lte: now }, endTime: { $gt: now }, status: 'scheduled' },
        { status: 'live' }
      );
      // Mark sessions as completed
      await Session.updateMany(
        { endTime: { $lte: now }, status: { $in: ['scheduled', 'live'] } },
        { status: 'completed' }
      );
    } catch (err) {
      logger.error(`[CRON] Session status job failed: ${err.message}`);
    }
  });
};

// Job: Cleanup old notifications (older than 60 days, weekly Sunday 3 AM)
const cleanupNotificationsJob = () => {
  cron.schedule('0 3 * * 0', async () => {
    logger.info('[CRON] Running notification cleanup...');
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: sixtyDaysAgo },
        isRead: true,
      });
      logger.info(`[CRON] Deleted ${result.deletedCount} old notifications`);
    } catch (err) {
      logger.error(`[CRON] Notification cleanup failed: ${err.message}`);
    }
  });
};

// Job: Send reminders for assignments due tomorrow (daily 6 PM)
const assignmentReminderJob = () => {
  cron.schedule('0 18 * * *', async () => {
    logger.info('[CRON] Running assignment reminder job...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const assignments = await Assignment.find({
        dueDate: { $gte: tomorrow, $lt: dayAfter },
        status: 'published',
      });

      for (const a of assignments) {
        const enrollments = await Enrollment.find({ batch: a.batch }).select('student');
        const studentIds = enrollments.map((e) => e.student);
        if (studentIds.length > 0) {
          await NotificationService.send({
            recipient: studentIds,
            type: 'assignment_due',
            title: 'Assignment Due Tomorrow',
            message: `${a.title} is due tomorrow`,
            link: `/dashboard/assignments/${a._id}`,
            priority: 'high',
          });
        }
      }
      logger.info(`[CRON] Sent reminders for ${assignments.length} assignments`);
    } catch (err) {
      logger.error(`[CRON] Assignment reminder failed: ${err.message}`);
    }
  });
};

const initJobs = () => {
  if (process.env.DISABLE_CRON === 'true') {
    logger.info('Cron jobs disabled via DISABLE_CRON');
    return;
  }
  feeReminderJob();
  attendanceWarningJob();
  overdueAssignmentJob();
  sessionStatusJob();
  cleanupNotificationsJob();
  assignmentReminderJob();
  logger.info('Cron jobs initialised');
};

module.exports = { initJobs };
