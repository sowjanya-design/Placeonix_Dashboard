const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

const initTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured — emails will be logged instead of sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  transporter.verify((err) => {
    if (err) logger.error('SMTP connection failed:', err.message);
    else logger.info('✓ SMTP transporter ready');
  });

  return transporter;
};

/**
 * Sends an email. Falls back to logging in development if SMTP not configured.
 */
const sendEmail = async ({ to, subject, html, text, attachments }) => {
  const tx = initTransporter();
  const from = process.env.EMAIL_FROM || 'Placeonix <noreply@placeonix.in>';

  if (!tx) {
    logger.info(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`);
    logger.debug(text || html);
    return { messageId: 'logged', accepted: [to] };
  }

  try {
    const info = await tx.sendMail({ from, to, subject, html, text, attachments });
    logger.info(`Email sent to ${to} - messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email send failed to ${to}: ${err.message}`);
    throw err;
  }
};

// ── Email templates ──

const baseTemplate = (title, body, ctaText, ctaUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e2d45;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,62,0.08);">
    <div style="background:#0d1b3e;padding:24px 32px;color:#fff;">
      <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;">Placeonix</div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.6;margin-top:4px;">Training • Placement • Future</div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#0d1b3e;">${title}</h1>
      <div style="font-size:15px;line-height:1.7;color:#2d3d5a;">${body}</div>
      ${ctaUrl ? `<div style="margin:28px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#0d1b3e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">${ctaText}</a></div>` : ''}
    </div>
    <div style="padding:20px 32px;background:#f4f7fb;border-top:1px solid #e2e8f2;font-size:12px;color:#6b7a96;">
      &copy; ${new Date().getFullYear()} Placeonix. Hyderabad, India.
    </div>
  </div>
</body>
</html>`;

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to Placeonix!',
    html: baseTemplate(
      `Welcome, ${user.firstName}!`,
      `<p>Your Placeonix account has been created. You can now log in and start your learning journey.</p>
       <p><strong>Enrollment ID:</strong> ${user.studentProfile?.enrollmentId || 'Not assigned yet'}</p>
       <p>Our team will be in touch shortly to help you get started.</p>`,
      'Login to Dashboard',
      `${process.env.CLIENT_URL}/login`
    ),
  });

const sendPasswordResetEmail = (user, resetToken) => {
  const url = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password',
    html: baseTemplate(
      'Password Reset Request',
      `<p>Hi ${user.firstName},</p>
       <p>We received a request to reset your password. Click the button below to set a new one.</p>
       <p><strong>This link expires in 30 minutes.</strong></p>
       <p>If you didn't request this, you can safely ignore this email.</p>`,
      'Reset Password',
      url
    ),
  });
};

const sendEnrollmentEmail = (user, course, batch) =>
  sendEmail({
    to: user.email,
    subject: `Enrolled: ${course.title}`,
    html: baseTemplate(
      'Enrollment Confirmed',
      `<p>Hi ${user.firstName},</p>
       <p>You're successfully enrolled in <strong>${course.title}</strong>.</p>
       <p><strong>Batch:</strong> ${batch.name}<br>
       <strong>Starts:</strong> ${new Date(batch.startDate).toDateString()}<br>
       <strong>Mode:</strong> ${batch.mode}</p>
       <p>We'll see you in class!</p>`,
      'View My Course',
      `${process.env.CLIENT_URL}/dashboard`
    ),
  });

const sendPlacementInviteEmail = (user, drive) =>
  sendEmail({
    to: user.email,
    subject: `New Placement Drive: ${drive.company}`,
    html: baseTemplate(
      `${drive.company} is hiring!`,
      `<p>Hi ${user.firstName},</p>
       <p>A new placement opportunity has opened up that matches your profile.</p>
       <p><strong>Company:</strong> ${drive.company}<br>
       <strong>Role:</strong> ${drive.role}<br>
       <strong>Package:</strong> ₹${drive.package.min} - ₹${drive.package.max} LPA<br>
       <strong>Apply by:</strong> ${new Date(drive.applicationDeadline).toDateString()}</p>`,
      'Apply Now',
      `${process.env.CLIENT_URL}/dashboard/placements/${drive._id}`
    ),
  });

const sendLeadConfirmationEmail = (lead) =>
  sendEmail({
    to: lead.email,
    subject: 'We received your inquiry',
    html: baseTemplate(
      `Thanks ${lead.firstName}!`,
      `<p>We've received your inquiry about Placeonix programs.</p>
       <p>Our admissions team will reach out within 24 hours to answer your questions and help you find the right course.</p>
       <p>In the meantime, feel free to call us at +91 98765 43210 if you'd like to chat sooner.</p>`,
      'Visit Website',
      process.env.CLIENT_URL
    ),
  });

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
  sendPlacementInviteEmail,
  sendLeadConfirmationEmail,
};
