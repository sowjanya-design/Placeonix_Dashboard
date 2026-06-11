module.exports = {
  ROLES: {
    ADMIN: 'admin',
    MENTOR: 'mentor',
    STUDENT: 'student',
  },

  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING: 'pending',
  },

  COURSE_LEVEL: {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    ALL: 'Beginner to Advanced',
  },

  COURSE_CATEGORY: {
    WEB_DEV: 'Web Development',
    DATA_SCI: 'Data Science',
    ERP: 'ERP',
    DEVOPS: 'Cloud & DevOps',
    CYBERSEC: 'Cybersecurity',
    UIUX: 'UI/UX',
    PROGRAMMING: 'Programming',
    OTHER: 'Other',
  },

  BATCH_STATUS: {
    UPCOMING: 'upcoming',
    ENROLLING: 'enrolling',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  ENROLLMENT_STATUS: {
    ENROLLED: 'enrolled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    DROPPED: 'dropped',
    AT_RISK: 'at_risk',
  },

  ASSIGNMENT_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    SUBMITTED: 'submitted',
    REVIEWED: 'reviewed',
    LATE: 'late',
  },

  PLACEMENT_STATUS: {
    APPLIED: 'applied',
    SHORTLISTED: 'shortlisted',
    INTERVIEW: 'interview_scheduled',
    OFFERED: 'offered',
    PLACED: 'placed',
    REJECTED: 'rejected',
  },

  ATTENDANCE: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    EXCUSED: 'excused',
  },

  MAX_BATCH_SIZE: 30,
};
