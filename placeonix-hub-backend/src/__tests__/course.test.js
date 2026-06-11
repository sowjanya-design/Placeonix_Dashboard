process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const User = require('../models/User');
const Course = require('../models/Course');

describe('Course API', () => {
  let adminToken;
  let admin;

  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await clear();
    admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'Password123',
      role: 'admin',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123' });
    adminToken = res.body.data.accessToken;
  });

  describe('POST /api/v1/courses', () => {
    it('should create a course with modules', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Course',
          category: 'Web Development',
          description: 'A test course description',
          duration: '4 Months',
          fee: { amount: 50000 },
          modules: [
            {
              order: 1,
              title: 'Module 1',
              duration: '2 weeks',
              topics: [{ title: 'Topic A', duration: 60 }],
            },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.course.title).toBe('Test Course');
      expect(res.body.data.course.modules).toHaveLength(1);
      expect(res.body.data.course.slug).toBe('test-course');
    });

    it('should require admin role', async () => {
      const student = await User.create({
        firstName: 'S', lastName: 'T', email: 's@t.com', password: 'Password123', status: 'active',
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 's@t.com', password: 'Password123' });

      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
        .send({
          title: 'X',
          category: 'Web Development',
          description: 'Y',
          duration: '1 month',
          fee: { amount: 1 },
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/courses', () => {
    it('should list published courses publicly', async () => {
      await Course.create({
        title: 'Public', category: 'Web Development', description: 'X', duration: '1m',
        fee: { amount: 1000 }, isPublished: true, createdBy: admin._id,
      });
      await Course.create({
        title: 'Hidden', category: 'Web Development', description: 'X', duration: '1m',
        fee: { amount: 1000 }, isPublished: false, createdBy: admin._id,
      });

      const res = await request(app).get('/api/v1/courses');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Public');
    });
  });

  describe('Module management', () => {
    let courseId;

    beforeEach(async () => {
      const c = await Course.create({
        title: 'Test', category: 'Web Development', description: 'X',
        duration: '4m', fee: { amount: 1000 }, createdBy: admin._id,
      });
      courseId = c._id;
    });

    it('should add a module', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${courseId}/modules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New Module', duration: '1 week', topics: [] });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.course.modules).toHaveLength(1);
    });
  });
});
