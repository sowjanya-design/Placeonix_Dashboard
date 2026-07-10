/*
 * Placeonix Hub — Notification service.
 * Helper for creating in-app notifications (single or bulk/broadcast) used across
 * the controllers.
 */
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Centralised notification helper.
 * Use for in-app notifications. Emails handled separately by emailService.
 */
class NotificationService {
  /** Create an in-app notification via Notification.notify; logs and swallows errors so it never breaks the caller. */
  static async send(options) {
    try {
      return await Notification.notify(options);
    } catch (err) {
      logger.error(`Notification send failed: ${err.message}`);
    }
  }

  /** Notify a batch's students that a new assignment was posted. */
  static async notifyAssignmentCreated(students, assignment, batch) {
    return this.send({
      recipient: students.map((s) => s._id || s),
      type: 'assignment_created',
      title: 'New Assignment Posted',
      message: `${assignment.title} — Due ${new Date(assignment.dueDate).toLocaleDateString()}`,
      icon: 'task',
      link: `/dashboard/assignments/${assignment._id}`,
      relatedTo: { model: 'Assignment', id: assignment._id },
      priority: 'high',
    });
  }

  /** Notify a student that their submission has been graded. */
  static async notifyAssignmentReviewed(studentId, assignment, score) {
    return this.send({
      recipient: studentId,
      type: 'assignment_reviewed',
      title: 'Assignment Reviewed',
      message: `Your "${assignment.title}" has been reviewed. Score: ${score || 'N/A'}`,
      icon: 'check',
      link: `/dashboard/assignments/${assignment._id}`,
      relatedTo: { model: 'Assignment', id: assignment._id },
    });
  }

  /** Notify recipients about a new announcement. */
  static async notifyAnnouncement(recipients, announcement) {
    return this.send({
      recipient: recipients,
      type: 'announcement',
      title: announcement.title,
      message: announcement.body.substring(0, 200),
      icon: 'announcement',
      link: `/dashboard/announcements/${announcement._id}`,
      relatedTo: { model: 'Announcement', id: announcement._id },
      priority: announcement.priority === 'high' ? 'high' : 'normal',
    });
  }

  /** Notify students about a new placement drive. */
  static async notifyPlacementDrive(students, drive) {
    return this.send({
      recipient: students,
      type: 'placement_drive',
      title: `New Drive: ${drive.company}`,
      message: `${drive.role} — Apply by ${new Date(drive.applicationDeadline).toLocaleDateString()}`,
      icon: 'placement',
      link: `/dashboard/placements/${drive._id}`,
      relatedTo: { model: 'PlacementDrive', id: drive._id },
      priority: 'high',
    });
  }

  /** Notify a student that their enrollment is confirmed. */
  static async notifyEnrollment(studentId, course, batch) {
    return this.send({
      recipient: studentId,
      type: 'enrollment',
      title: 'Enrollment Confirmed',
      message: `Welcome to ${course.title} — Batch ${batch.name}`,
      icon: 'enrollment',
      link: `/dashboard/courses/${course._id}`,
    });
  }

  /** Warn a student that their attendance has dropped too low. */
  static async notifyAttendanceWarning(studentId, percentage) {
    return this.send({
      recipient: studentId,
      type: 'attendance_warning',
      title: 'Low Attendance Alert',
      message: `Your attendance is at ${percentage}%. Aim for 75%+ to stay eligible for placements.`,
      icon: 'warning',
      priority: 'high',
    });
  }

  /** Remind a student about outstanding fees. */
  static async notifyFeeReminder(studentId, dueAmount, dueDate) {
    return this.send({
      recipient: studentId,
      type: 'fee_reminder',
      title: 'Fee Payment Reminder',
      message: `Outstanding: ₹${dueAmount}${dueDate ? ` — Due ${new Date(dueDate).toLocaleDateString()}` : ''}`,
      icon: 'payment',
      priority: 'high',
    });
  }
}

module.exports = NotificationService;
