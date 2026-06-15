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
const Attendance = require('../models/Attendance');
const Resource = require('../models/Resource');
const Lead = require('../models/Lead');
const Payment = require('../models/Payment');
const Certificate = require('../models/Certificate');
const Review = require('../models/Review');
const JoinRequest = require('../models/JoinRequest');

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
      Attendance.deleteMany({}),
      Resource.deleteMany({}),
      Lead.deleteMany({}),
      Payment.deleteMany({}),
      Certificate.deleteMany({}),
      Review.deleteMany({}),
      JoinRequest.deleteMany({}),
    ]);

    logger.info('Creating users...');

    const admin = await User.create({
      firstName: 'Avinash', lastName: 'Murari',
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
      duration: '4-6 Months', durationWeeks: 20,
      level: 'Beginner to Advanced',
      fee: { amount: 25000, currency: 'INR', installments: 3 },
      color: '#6c3ff5',
      tags: ['MERN', 'React', 'Node.js', 'Java'],
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
      description: 'Master Python, Machine Learning, and data visualization with real datasets.',
      duration: '4-6 Months', level: 'Intermediate',
      fee: { amount: 40000 }, color: '#0ea5c9',
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
      description: 'Master SAP Financial Accounting & Controlling with live SAP S/4HANA server access.',
      shortDescription: 'Finance & Controlling on live SAP servers',
      duration: '2-3 Months', level: 'Intermediate',
      fee: { amount: 22000 }, color: '#d97706',
      tags: ['SAP', 'Finance', 'Controlling'],
      modules: [
        { order: 1, title: 'SAP Overview', duration: '1 week',
          topics: [{ title: 'SAP Architecture', duration: 60 }] },
        { order: 2, title: 'Financial Accounting', duration: '6 weeks',
          topics: [{ title: 'General Ledger', duration: 120 }] },
      ],
      isPublished: true, createdBy: admin._id,
    });

    logger.info('Creating full course catalog (brochure)...');
    await Course.insertMany([
      // ─── SAP Cloud — Modern SAP Modules ───
      { title: 'SAP Full Stack Program', category: 'ERP', color: '#7c3aed', isPublished: true, isFeatured: true, createdBy: admin._id,
        description: 'Flagship 5-module SAP cloud & modern dev stack: BTP, CAP, UI5/Fiori and CPI for working professionals.',
        shortDescription: 'Complete SAP Cloud & Modern Dev Stack — 5 modules', duration: '4-6 Months', level: 'Beginner to Advanced',
        fee: { amount: 65000 }, tags: ['SAP BTP', 'SAP CAP', 'UI5/Fiori', 'SAP CPI'] },
      { title: 'SAP BTP (Cloud Platform)', category: 'ERP', color: '#7c3aed', isPublished: true, createdBy: admin._id,
        description: 'SAP Business Technology Platform with HANA Cloud — the foundation of modern SAP development.',
        shortDescription: 'BTP + HANA Cloud', duration: '6-8 Weeks', level: 'Intermediate', fee: { amount: 33000 }, tags: ['BTP', 'HANA'] },
      { title: 'SAP CPI (Integration Suite)', category: 'ERP', color: '#8b5cf6', isPublished: true, createdBy: admin._id,
        description: 'Cloud Platform Integration — build integration flows and APIs across SAP and non-SAP systems.',
        shortDescription: 'Integration Flows + API', duration: '6-8 Weeks', level: 'Intermediate', fee: { amount: 33000 }, tags: ['Flows', 'API'] },
      { title: 'SAP CAPM', category: 'ERP', color: '#6366f1', isPublished: true, createdBy: admin._id,
        description: 'Cloud Application Programming Model with Node.js and CDS for full-stack SAP cloud apps.',
        shortDescription: 'Node.js + CDS', duration: '6-8 Weeks', level: 'Intermediate', fee: { amount: 33000 }, tags: ['Node', 'CDS'] },
      { title: 'SAP RAP (ABAP RESTful)', category: 'ERP', color: '#4f46e5', isPublished: true, createdBy: admin._id,
        description: 'ABAP RESTful Application Programming model building OData V4 services on S/4HANA.',
        shortDescription: 'OData V4 services', duration: '6-8 Weeks', level: 'Advanced', fee: { amount: 36000 }, tags: ['OData V4', 'RAP'] },
      { title: 'SAP UI5 / Fiori', category: 'ERP', color: '#0ea5c9', isPublished: true, createdBy: admin._id,
        description: 'Build responsive SAP Fiori apps with the SAPUI5 framework.',
        shortDescription: 'Fiori Apps', duration: '6-8 Weeks', level: 'Intermediate', fee: { amount: 28000 }, tags: ['Fiori', 'UI5'] },
      { title: 'SAP ABAP / S4HANA', category: 'ERP', color: '#d97706', isPublished: true, createdBy: admin._id,
        description: 'Core ABAP development on S/4HANA — RICEF objects and CDS views.',
        shortDescription: 'RICEF + CDS', duration: '6-8 Weeks', level: 'Beginner to Advanced', fee: { amount: 25000 }, tags: ['RICEF', 'CDS'] },
      // ─── SAP Core — Functional Modules ───
      { title: 'SAP MM', category: 'ERP', color: '#d97706', isPublished: true, createdBy: admin._id,
        description: 'SAP Materials Management — procurement and inventory for supply chain professionals.',
        shortDescription: 'Materials Management', duration: '2-3 Months', level: 'Intermediate', fee: { amount: 22000 }, tags: ['SAP', 'Procurement'] },
      { title: 'SAP SD', category: 'ERP', color: '#d97706', isPublished: true, createdBy: admin._id,
        description: 'SAP Sales & Distribution — order-to-cash for sales and distribution teams.',
        shortDescription: 'Sales & Distribution', duration: '2-3 Months', level: 'Intermediate', fee: { amount: 22000 }, tags: ['SAP', 'Sales'] },
      { title: 'SAP BASIS', category: 'ERP', color: '#d97706', isPublished: true, createdBy: admin._id,
        description: 'SAP BASIS administration — system administration for IT professionals.',
        shortDescription: 'System Administration', duration: '2-3 Months', level: 'Intermediate', fee: { amount: 22000 }, tags: ['SAP', 'Admin'] },
      // ─── Technology Programs ───
      { title: 'Java & Backend Development', category: 'Programming', color: '#ef4444', isPublished: true, createdBy: admin._id,
        description: 'Backend engineering with Java, Spring Boot and REST APIs.',
        shortDescription: 'Java + Spring Boot', duration: '4-6 Months', level: 'Beginner to Advanced', fee: { amount: 20000 }, tags: ['Java', 'Spring', 'Backend'] },
      { title: 'DevOps & Cloud Engineering', category: 'Cloud & DevOps', color: '#0ea5c9', isPublished: true, isFeatured: true, createdBy: admin._id,
        description: 'CI/CD, containers and cloud on AWS & Azure with hands-on cloud credits.',
        shortDescription: 'AWS + Azure', duration: '4-6 Months', level: 'Intermediate', fee: { amount: 37000 }, tags: ['AWS', 'Azure', 'Docker', 'K8s'] },
      { title: 'Cyber Security Fundamentals', category: 'Cybersecurity', color: '#dc2626', isPublished: true, createdBy: admin._id,
        description: 'Network security, ethical hacking and defensive security fundamentals.',
        shortDescription: 'Security essentials', duration: '4-6 Months', level: 'Beginner to Advanced', fee: { amount: 20000 }, tags: ['Security', 'Networking'] },
      { title: 'UI/UX Design', category: 'UI/UX', color: '#ec4899', isPublished: true, createdBy: admin._id,
        description: 'Product design with Figma — wireframing, prototyping and design systems.',
        shortDescription: 'Figma + Design Systems', duration: '4-6 Months', level: 'Beginner to Advanced', fee: { amount: 15000 }, tags: ['Figma', 'Design'] },
    ]);

    logger.info('Creating batches...');
    // ONLINE batch → students attend live classes
    const batchA = await Batch.create({
      name: 'Full Stack — Online Batch A', code: 'FS-A-2025',
      course: fullStack._id, mentor: mentor1._id,
      startDate: new Date('2025-01-15'), endDate: new Date('2025-06-15'),
      schedule: { days: ['Mon', 'Wed', 'Fri'], startTime: '18:00', endTime: '20:00' },
      mode: 'online', capacity: 30, enrolledCount: 2, status: 'active',
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

    // OFFLINE batch → in-person classes, students get recordings
    const batchC = await Batch.create({
      name: 'SAP FICO — Offline Batch C', code: 'SAP-C-2025',
      course: sapFico._id, mentor: mentor1._id,
      startDate: new Date('2025-03-01'), endDate: new Date('2025-06-01'),
      schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu'], startTime: '08:00', endTime: '10:00' },
      mode: 'offline', venue: 'Kapil Kavuri Hub, 9th Floor — Hyderabad',
      capacity: 25, enrolledCount: 1, status: 'active',
      createdBy: admin._id,
    });

    logger.info('Creating enrollments...');
    // Demo student (Arjun) is enrolled in BOTH an online batch (live classes)
    // and an offline batch (class recordings) to showcase both experiences.
    const enrA1 = await Enrollment.create({
      student: student1._id, batch: batchA._id, course: fullStack._id,
      fee: { total: 25000, paid: 20000, due: 5000 },
      progress: { overall: 72 }, status: 'in_progress',
    });
    const enrC1 = await Enrollment.create({
      student: student1._id, batch: batchC._id, course: sapFico._id,
      fee: { total: 22000, paid: 22000, due: 0 },
      progress: { overall: 40 }, status: 'in_progress',
    });
    const enrA2 = await Enrollment.create({
      student: student2._id, batch: batchA._id, course: fullStack._id,
      fee: { total: 25000, paid: 25000, due: 0 },
      progress: { overall: 63 }, status: 'completed', completionDate: new Date(),
    });
    const enrB3 = await Enrollment.create({
      student: student3._id, batch: batchB._id, course: dataSci._id,
      fee: { total: 40000, paid: 25000, due: 15000 },
      progress: { overall: 45 }, status: 'in_progress',
    });

    logger.info('Creating sessions (live classes + recordings)...');
    const dayAt = (days, h) => { const d = new Date(); d.setDate(d.getDate()+days); d.setHours(h,0,0,0); return d; };
    const REC = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    ];
    // Online batch A — LIVE now + upcoming live classes (+ one past recording)
    const liveStart = new Date(); liveStart.setMinutes(liveStart.getMinutes() - 20);
    const liveEnd = new Date(); liveEnd.setMinutes(liveEnd.getMinutes() + 90);
    await Session.insertMany([
      { title: 'React Hooks Deep Dive', batch: batchA._id, course: fullStack._id, instructor: mentor1._id,
        startTime: liveStart, endTime: liveEnd, mode: 'online', meetingLink: 'https://meet.google.com/placeonix-live',
        status: 'live', agenda: ['useState', 'useEffect', 'Custom hooks'], createdBy: admin._id },
      { title: 'Live Coding: REST APIs with Node.js', batch: batchA._id, course: fullStack._id, instructor: mentor1._id,
        startTime: dayAt(1, 18), endTime: dayAt(1, 20), mode: 'online', meetingLink: 'https://meet.google.com/placeonix-live',
        status: 'scheduled', agenda: ['Express routing', 'JWT auth', 'Live Q&A'], createdBy: admin._id },
      { title: 'React State Management Workshop', batch: batchA._id, course: fullStack._id, instructor: mentor1._id,
        startTime: dayAt(3, 18), endTime: dayAt(3, 20), mode: 'online', meetingLink: 'https://meet.google.com/placeonix-live',
        status: 'scheduled', agenda: ['Context API', 'Redux Toolkit basics', 'When to lift state'], createdBy: admin._id },
      { title: 'Mock Interview & Resume Review', batch: batchA._id, course: fullStack._id, instructor: mentor1._id,
        startTime: dayAt(5, 18), endTime: dayAt(5, 20), mode: 'online', meetingLink: 'https://meet.google.com/placeonix-live',
        status: 'scheduled', agenda: ['DSA quick round', 'Project walkthrough', 'Resume feedback'], createdBy: admin._id },
      { title: 'JavaScript ES6+ Essentials', batch: batchA._id, course: fullStack._id, instructor: mentor1._id,
        startTime: dayAt(-3, 18), endTime: dayAt(-3, 20), mode: 'online', status: 'completed',
        recordingUrl: REC[2], agenda: ['let/const & scope', 'Arrow functions', 'Destructuring', 'Promises'], createdBy: admin._id },
    ]);
    // Offline batch C — recordings of past in-person classes + one upcoming in-person
    await Session.insertMany([
      { title: 'SAP FICO: Organizational Structure', batch: batchC._id, course: sapFico._id, instructor: mentor1._id,
        startTime: dayAt(-6, 8), endTime: dayAt(-6, 10), mode: 'offline', venue: 'Room 204', status: 'completed',
        recordingUrl: REC[0], agenda: ['Company code', 'Chart of accounts', 'Fiscal year variant'], createdBy: admin._id },
      { title: 'SAP FICO: General Ledger Accounting', batch: batchC._id, course: sapFico._id, instructor: mentor1._id,
        startTime: dayAt(-4, 8), endTime: dayAt(-4, 10), mode: 'offline', venue: 'Room 204', status: 'completed',
        recordingUrl: REC[1], agenda: ['GL master data', 'Document posting', 'Account groups'], createdBy: admin._id },
      { title: 'SAP FICO: Accounts Payable', batch: batchC._id, course: sapFico._id, instructor: mentor1._id,
        startTime: dayAt(-2, 8), endTime: dayAt(-2, 10), mode: 'offline', venue: 'Room 204', status: 'completed',
        recordingUrl: REC[2], agenda: ['Vendor master', 'Invoice posting', 'Outgoing payments'], createdBy: admin._id },
      { title: 'SAP FICO: Accounts Receivable', batch: batchC._id, course: sapFico._id, instructor: mentor1._id,
        startTime: dayAt(1, 8), endTime: dayAt(1, 10), mode: 'offline', venue: 'Kapil Kavuri Hub, 9th Floor', status: 'scheduled',
        agenda: ['Customer master', 'Incoming payments', 'Dunning basics'], createdBy: admin._id },
    ]);

    logger.info('Creating attendance...');
    function genAttendance(studentId, batchId, markedBy, count, presentRate) {
      const rows = [];
      let offset = 1, made = 0;
      while (made < count) {
        const d = new Date(); d.setDate(d.getDate() - offset); d.setHours(0, 0, 0, 0); offset++;
        if (d.getDay() === 0) continue; // skip Sundays
        const r = Math.random();
        let status = 'present';
        if (r > presentRate + 0.12) status = 'absent';
        else if (r > presentRate + 0.05) status = 'excused';
        else if (r > presentRate) status = 'late';
        rows.push({ student: studentId, batch: batchId, date: d, status, sessionTitle: 'Class', markedBy });
        made++;
      }
      return rows;
    }
    await Attendance.insertMany([
      ...genAttendance(student1._id, batchA._id, mentor1._id, 24, 0.84),
      ...genAttendance(student1._id, batchC._id, mentor1._id, 18, 0.80),
      ...genAttendance(student2._id, batchA._id, mentor1._id, 24, 0.74),
      ...genAttendance(student3._id, batchB._id, mentor2._id, 20, 0.70),
    ]);

    logger.info('Creating resources...');
    await Resource.insertMany([
      { title: 'React Official Documentation', type: 'link', externalUrl: 'https://react.dev', course: fullStack._id, accessLevel: 'enrolled', uploadedBy: mentor1._id, tags: ['React'] },
      { title: 'MDN JavaScript Guide', type: 'link', externalUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', course: fullStack._id, accessLevel: 'enrolled', uploadedBy: mentor1._id, tags: ['JavaScript'] },
      { title: 'Full Stack Roadmap (PDF)', type: 'pdf', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', course: fullStack._id, accessLevel: 'enrolled', uploadedBy: mentor1._id },
      { title: 'SAP FICO Configuration Handbook', type: 'document', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', course: sapFico._id, accessLevel: 'enrolled', uploadedBy: mentor2._id },
      { title: 'SAP FICO Class Notes', type: 'pdf', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', course: sapFico._id, accessLevel: 'enrolled', uploadedBy: mentor2._id },
      { title: 'Intro Walkthrough (Video)', type: 'video', fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', course: fullStack._id, accessLevel: 'enrolled', uploadedBy: mentor1._id },
    ]);

    logger.info('Creating leads...');
    await Lead.insertMany([
      { firstName: 'Sneha', lastName: 'Patil', email: 'sneha@example.com', phone: '9876543210', courseInterestedName: 'Full Stack', source: 'website', status: 'new' },
      { firstName: 'Vikram', lastName: 'Nair', email: 'vikram.lead@example.com', phone: '9876501234', courseInterestedName: 'Data Science', source: 'referral', status: 'contacted' },
      { firstName: 'Anjali', lastName: 'Rao', email: 'anjali@example.com', phone: '9123456780', courseInterestedName: 'SAP FICO', source: 'instagram', status: 'follow-up' },
      { firstName: 'Karthik', lastName: 'Iyer', email: 'karthik@example.com', phone: '9988776655', courseInterestedName: 'Full Stack', source: 'website', status: 'converted' },
      { firstName: 'Meera', lastName: 'Joshi', email: 'meera@example.com', phone: '9001122334', courseInterestedName: 'UI/UX Design', source: 'walk-in', status: 'new' },
      { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.lead@example.com', phone: '9445566778', courseInterestedName: 'DevOps', source: 'whatsapp', status: 'new' },
    ]);

    logger.info('Creating payments...');
    const yr = new Date().getFullYear();
    await Payment.insertMany([
      { enrollment: enrA1._id, student: student1._id, amount: 12500, method: 'upi', status: 'completed', paidOn: dayAt(-40, 10), installmentNumber: 1, invoiceNumber: `PLX/${yr}/000001`, transactionId: 'TXN1001' },
      { enrollment: enrA1._id, student: student1._id, amount: 7500, method: 'card', status: 'completed', paidOn: dayAt(-10, 10), installmentNumber: 2, invoiceNumber: `PLX/${yr}/000002`, transactionId: 'TXN1002' },
      { enrollment: enrC1._id, student: student1._id, amount: 22000, method: 'bank_transfer', status: 'completed', paidOn: dayAt(-30, 10), invoiceNumber: `PLX/${yr}/000003`, transactionId: 'TXN1003' },
      { enrollment: enrA2._id, student: student2._id, amount: 25000, method: 'upi', status: 'completed', paidOn: dayAt(-25, 10), invoiceNumber: `PLX/${yr}/000004`, transactionId: 'TXN1004' },
      { enrollment: enrB3._id, student: student3._id, amount: 25000, method: 'card', status: 'completed', paidOn: dayAt(-15, 10), invoiceNumber: `PLX/${yr}/000005`, transactionId: 'TXN1005' },
      { enrollment: enrB3._id, student: student3._id, amount: 15000, method: 'upi', status: 'pending', invoiceNumber: `PLX/${yr}/000006`, transactionId: 'TXN1006' },
    ]);

    logger.info('Creating certificates...');
    await Certificate.insertMany([
      { student: student2._id, course: fullStack._id, batch: batchA._id, enrollment: enrA2._id, certificateNumber: `PLX-CERT-${yr}-00001`, type: 'completion', grade: 'A+', score: 92, issuedDate: dayAt(-5, 10), studentNameSnapshot: 'Sneha Patel', courseNameSnapshot: 'Full Stack Web Development', issuedBy: admin._id },
      { student: student1._id, course: sapFico._id, batch: batchC._id, enrollment: enrC1._id, certificateNumber: `PLX-CERT-${yr}-00002`, type: 'completion', grade: 'A', score: 88, issuedDate: dayAt(-2, 10), studentNameSnapshot: 'Arjun Reddy', courseNameSnapshot: 'SAP FICO', issuedBy: admin._id },
    ]);

    logger.info('Creating reviews...');
    await Review.insertMany([
      { student: student1._id, targetType: 'mentor', target: mentor1._id, rating: 5, title: 'Best mentor!', comment: 'Priya ma\'am explains React concepts incredibly well. Always patient and clear.', aspects: { teaching: 5, content: 5, support: 5, practical: 4 }, wouldRecommend: true },
      { student: student2._id, targetType: 'course', target: fullStack._id, rating: 4, title: 'Great course', comment: 'Loved the hands-on projects. Would like even more live coding sessions.', wouldRecommend: true },
      { student: student3._id, targetType: 'institute', target: admin._id, rating: 5, title: 'Highly recommend Placeonix', comment: 'Real IT workspace and excellent placement support. Got referred to top companies.', wouldRecommend: true },
      { student: student1._id, targetType: 'course', target: sapFico._id, rating: 5, title: 'Live SAP access is a game changer', comment: 'Practising on real SAP servers made all the difference.', wouldRecommend: true },
    ]);

    logger.info('Creating online-join requests...');
    await JoinRequest.insertMany([
      { student: student1._id, batch: batchC._id, course: sapFico._id, mentor: mentor1._id,
        requestedDate: dayAt(1, 8), reason: 'Travelling this week — would like to attend the AR class online.', status: 'pending' },
      { student: student1._id, batch: batchC._id, course: sapFico._id, mentor: mentor1._id,
        requestedDate: dayAt(-2, 8), reason: 'Was unwell, requested remote access.', status: 'approved', meetingLink: 'https://meet.google.com/placeonix-live', respondedBy: mentor1._id, respondedAt: dayAt(-3, 12) },
    ]);

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
