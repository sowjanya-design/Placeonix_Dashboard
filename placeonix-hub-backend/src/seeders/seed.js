require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const logger = require('../utils/logger');

const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const Session = require('../models/Session');
const Assignment = require('../models/Assignment');
const Announcement = require('../models/Announcement');
const PlacementDrive = require('../models/PlacementDrive');
const Notification = require('../models/Notification');

const seedData = async () => {
  try {
    await connectDB();

    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Batch.deleteMany({}),
      Enrollment.deleteMany({}),
      Session.deleteMany({}),
      Assignment.deleteMany({}),
      Announcement.deleteMany({}),
      PlacementDrive.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    logger.info('Creating users...');

    const admin = await User.create({
      firstName: 'Rajesh', lastName: 'Kumar',
      email: 'admin@placeonix.in', password: 'Password123',
      role: 'admin', phone: '+919876543210',
      status: 'active', emailVerified: true,
    });

    const mentor1 = await User.create({
      firstName: 'Priya', lastName: 'Sharma',
      email: 'mentor@placeonix.in', password: 'Password123',
      role: 'mentor', phone: '+919876543211',
      status: 'active', emailVerified: true,
      mentorProfile: {
        specialization: ['React', 'Node.js', 'MongoDB'],
        experience: 6, qualifications: ['B.Tech CSE', 'MERN Certified'],
        rating: 4.8, totalReviews: 16,
      },
    });

    const mentor2 = await User.create({
      firstName: 'Kiran', lastName: 'Babu',
      email: 'kiran@placeonix.in', password: 'Password123',
      role: 'mentor', phone: '+919876543212',
      status: 'active', emailVerified: true,
      mentorProfile: { specialization: ['Python', 'ML'], experience: 8, rating: 4.7 },
    });

    const student1 = await User.create({
      firstName: 'Arjun', lastName: 'Reddy',
      email: 'student@placeonix.in', password: 'Password123',
      role: 'student', phone: '+919876543213',
      status: 'active', emailVerified: true,
      studentProfile: {
        degree: 'B.Tech CSE', college: 'JNTU Hyderabad', graduationYear: 2024,
        skills: ['HTML', 'CSS', 'JavaScript'],
      },
    });

    const student2 = await User.create({
      firstName: 'Sneha', lastName: 'Patel',
      email: 'sneha@placeonix.in', password: 'Password123',
      role: 'student', phone: '+919876543214',
      status: 'active', emailVerified: true,
      studentProfile: { degree: 'B.Tech IT', college: 'OU College', graduationYear: 2024 },
    });

    const student3 = await User.create({
      firstName: 'Vikram', lastName: 'Singh',
      email: 'vikram@placeonix.in', password: 'Password123',
      role: 'student', phone: '+919876543215', status: 'active',
      studentProfile: { degree: 'B.Com', college: 'Osmania University', graduationYear: 2023 },
    });

    logger.info('Creating courses...');
    const fullStack = await Course.create({
      title: 'Full Stack Web Development',
      category: 'Web Development',
      description: 'Master modern web development with React, Node.js, Express, and MongoDB.',
      shortDescription: 'Become a full stack developer in 4 months',
      duration: '4 Months', durationWeeks: 16,
      level: 'Beginner to Advanced',
      fee: { amount: 45000, currency: 'INR', installments: 3 },
      color: '#3d5a80',
      tags: ['React', 'Node.js', 'MongoDB'],
      modules: [
        { order: 1, title: 'HTML & CSS Fundamentals', duration: '2 weeks',
          topics: [{ title: 'HTML5 Semantics', duration: 60 }, { title: 'CSS Flexbox & Grid', duration: 90 }] },
        { order: 2, title: 'JavaScript ES6+', duration: '3 weeks',
          topics: [{ title: 'Variables & Scope', duration: 60 }, { title: 'Async/Await', duration: 90 }] },
        { order: 3, title: 'React.js', duration: '4 weeks',
          topics: [{ title: 'Components', duration: 90 }, { title: 'Hooks', duration: 120 }] },
        { order: 4, title: 'Node.js & Express', duration: '3 weeks',
          topics: [{ title: 'REST APIs', duration: 120 }] },
      ],
      isPublished: true, isFeatured: true,
      instructor: mentor1._id, createdBy: admin._id,
    });

    const dataSci = await Course.create({
      title: 'Data Science & Analytics', category: 'Data Science',
      description: 'Master Python, ML, and data visualization.',
      duration: '5 Months', level: 'Intermediate',
      fee: { amount: 55000 }, color: '#0ea5c9',
      tags: ['Python', 'ML', 'Power BI'],
      modules: [
        { order: 1, title: 'Python for Data Science', duration: '3 weeks',
          topics: [{ title: 'NumPy', duration: 90 }, { title: 'Pandas', duration: 120 }] },
        { order: 2, title: 'Machine Learning', duration: '5 weeks',
          topics: [{ title: 'Regression', duration: 120 }] },
      ],
      isPublished: true, isFeatured: true,
      instructor: mentor2._id, createdBy: admin._id,
    });

    const sapFico = await Course.create({
      title: 'SAP FICO', category: 'ERP',
      description: 'Master SAP FICO with real system access.',
      duration: '4 Months', level: 'Intermediate',
      fee: { amount: 60000 }, color: '#d97706',
      tags: ['SAP', 'Finance'],
      modules: [
        { order: 1, title: 'SAP Overview', duration: '1 week',
          topics: [{ title: 'SAP Architecture', duration: 60 }] },
        { order: 2, title: 'Financial Accounting', duration: '6 weeks',
          topics: [{ title: 'General Ledger', duration: 120 }] },
      ],
      isPublished: true, createdBy: admin._id,
    });

    logger.info('Creating batches...');
    const batchA = await Batch.create({
      name: 'Full Stack — Batch A', code: 'FS-A-2025',
      course: fullStack._id, mentor: mentor1._id,
      startDate: new Date('2025-01-15'), endDate: new Date('2025-05-15'),
      schedule: { days: ['Mon', 'Wed', 'Fri'], startTime: '09:00', endTime: '11:00' },
      mode: 'offline', venue: 'Hyderabad Center',
      capacity: 30, enrolledCount: 2, status: 'active',
      createdBy: admin._id,
    });

    const batchB = await Batch.create({
      name: 'Data Science — Batch B', code: 'DS-B-2025',
      course: dataSci._id, mentor: mentor2._id,
      startDate: new Date('2025-02-01'), endDate: new Date('2025-07-01'),
      schedule: { days: ['Tue', 'Thu', 'Sat'], startTime: '10:00', endTime: '12:00' },
      mode: 'hybrid', capacity: 30, enrolledCount: 1, status: 'active',
      createdBy: admin._id,
    });

    logger.info('Creating enrollments...');
    await Enrollment.create({
      student: student1._id, batch: batchA._id, course: fullStack._id,
      fee: { total: 45000, paid: 30000, due: 15000 },
      progress: { overall: 87 }, status: 'in_progress',
    });
    await Enrollment.create({
      student: student2._id, batch: batchA._id, course: fullStack._id,
      fee: { total: 45000, paid: 45000, due: 0 },
      progress: { overall: 63 }, status: 'in_progress',
    });
    await Enrollment.create({
      student: student3._id, batch: batchB._id, course: dataSci._id,
      fee: { total: 55000, paid: 25000, due: 30000 },
      progress: { overall: 45 }, status: 'in_progress',
    });

    logger.info('Creating sessions...');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const today = new Date(); today.setHours(14, 0, 0, 0);
    await Session.create({
      title: 'React Hooks Deep Dive', batch: batchA._id, course: fullStack._id,
      instructor: mentor1._id, startTime: today, endTime: new Date(today.getTime() + 2*3600000),
      mode: 'offline', venue: 'Room 101', status: 'scheduled',
      agenda: ['useState basics', 'useEffect patterns', 'Custom hooks'],
      createdBy: admin._id,
    });
    await Session.create({
      title: 'Project Review', batch: batchA._id, course: fullStack._id,
      instructor: mentor1._id, startTime: tomorrow, endTime: new Date(tomorrow.getTime() + 2*3600000),
      mode: 'online', meetingLink: 'https://meet.example.com/abc',
      status: 'scheduled', createdBy: admin._id,
    });

    logger.info('Creating assignments...');
    await Assignment.create({
      title: 'React Portfolio Project', description: 'Build a personal portfolio with React',
      course: fullStack._id, batch: batchA._id,
      dueDate: new Date(Date.now() + 7*24*3600000),
      maxScore: 100, type: 'project', difficulty: 'medium',
      createdBy: mentor1._id, status: 'published',
    });
    await Assignment.create({
      title: 'Node REST API', description: 'Build a CRUD API with authentication',
      course: fullStack._id, batch: batchA._id,
      dueDate: new Date(Date.now() + 14*24*3600000),
      maxScore: 100, type: 'project', difficulty: 'hard',
      createdBy: mentor1._id, status: 'published',
    });

    logger.info('Creating announcements...');
    await Announcement.create({
      title: 'New Placement Drive — Infosys',
      body: 'Infosys is hiring 5 Full Stack Developers. Apply by April 28.',
      type: 'placement', priority: 'high',
      audience: { roles: ['student'] },
      createdBy: admin._id,
    });
    await Announcement.create({
      title: 'Holiday Notice — May 1',
      body: 'Institute will be closed on May 1 for Labour Day.',
      type: 'holiday',
      audience: { isPublic: true, roles: ['student', 'mentor'] },
      createdBy: admin._id,
    });

    logger.info('Creating placement drives...');
    await PlacementDrive.create({
      company: 'Infosys', role: 'Full Stack Developer',
      description: '5 openings for fresh graduates with React + Node experience.',
      requirements: ['React.js', 'Node.js', 'MongoDB'],
      package: { min: 5.5, max: 6, currency: 'INR' },
      location: ['Hyderabad', 'Bengaluru'], workMode: 'hybrid',
      vacancies: 5, eligibleCourses: [fullStack._id],
      applicationDeadline: new Date(Date.now() + 7*24*3600000),
      driveDate: new Date(Date.now() + 14*24*3600000),
      status: 'open', createdBy: admin._id,
    });
    await PlacementDrive.create({
      company: 'TCS', role: 'Junior Software Engineer',
      package: { min: 4.5, max: 5 },
      location: ['Hyderabad'], workMode: 'onsite',
      vacancies: 10, eligibleCourses: [fullStack._id, dataSci._id],
      applicationDeadline: new Date(Date.now() + 14*24*3600000),
      status: 'open', createdBy: admin._id,
    });

    logger.info('Creating notifications...');
    await Notification.create({
      recipient: student1._id, type: 'placement_drive',
      title: 'New Drive: Infosys', message: 'Full Stack Developer - 5.5 LPA',
      priority: 'high', link: '/dashboard/placements',
    });
    await Notification.create({
      recipient: student1._id, type: 'assignment_created',
      title: 'New Assignment', message: 'React Portfolio Project — Due in 7 days',
      link: '/dashboard/assignments',
    });

    logger.info('===========================================');
    logger.info('  Seeding complete!');
    logger.info('===========================================');
    logger.info('  Login credentials:');
    logger.info('  Admin:   admin@placeonix.in / Password123');
    logger.info('  Mentor:  mentor@placeonix.in / Password123');
    logger.info('  Student: student@placeonix.in / Password123');
    logger.info('===========================================');

    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
};

seedData();
